const express = require("express");
const dayjs = require("dayjs");
const { z } = require("zod");

const { requireAuth } = require("../lib/auth");
const { tenantMiddleware } = require("../lib/tenantMiddleware");
const { buildAttendanceWorkbook } = require("../lib/excel");
const Admin = require("../models/Admin");
const { sendWhatsAppMessage } = require("../lib/whatsappService");

const attendanceRouter = express.Router();

// Apply tenant middleware to ALL routes in this router
attendanceRouter.use(requireAuth, tenantMiddleware);

function normalizeDateParam(dateStr) {
  const d = dayjs(dateStr, ["YYYY-MM-DD", "YYYY/M/D", "YYYY/MM/DD", "YYYY-M-D"], true);
  if (!d.isValid()) return null;
  return d.format("YYYY-MM-DD");
}

attendanceRouter.get("/:date", async (req, res) => {
  const { Student, Attendance } = req.tenantModels;
  const { username } = req.user;
  const normalizedDate = normalizeDateParam(req.params.date);
  if (!normalizedDate) return res.status(400).json({ error: "Invalid date" });

  const startOfDay = dayjs(normalizedDate).startOf('day').subtract(1, 'hour').toDate();
  const endOfDay = dayjs(normalizedDate).endOf('day').add(1, 'hour').toDate();

  // 1. Get current day data
  const [studentsRaw, attendanceRaw, newStudentsRaw] = await Promise.all([
    Student.find({}).sort({ slNo: 1 }).lean(),
    Attendance.find({ date: normalizedDate }).sort({ slNo: 1 }).lean(),
    Student.find({ createdAt: { $gte: startOfDay, $lte: endOfDay } }).sort({ slNo: 1 }).lean()
  ]);

  const metadata = attendanceRaw.find(d => d.type === "metadata") || {};
  const presentDocs = attendanceRaw.filter(d => d.type === "student");
  const presentMap = new Map(presentDocs.map(p => [p.slNo, p]));

  // 2. Get previous day metadata + sold stock
  const prevMetadata = await Attendance.findOne({ 
    date: { $lt: normalizedDate },
    type: "metadata"
  }).sort({ date: -1 }).lean();

  let previousRemainingStock = 0;
  let previousOpeningStock = 0;
  let previousSoldStock = 0;

  if (prevMetadata) {
    const prevDate = prevMetadata.date;
    const prevStudentDocs = await Attendance.find({ date: prevDate, type: "student" }).lean();
    
    previousSoldStock = prevStudentDocs.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0);
    previousOpeningStock = prevMetadata.openingStock || 0;
    previousRemainingStock = Math.max(0, previousOpeningStock - previousSoldStock);
  }

  // 3. Build student list with status
  const students = studentsRaw.map(s => {
    const p = presentMap.get(s.slNo);
    return {
      ...s,
      id: s._id,
      present: !!p,
      quantity: p?.quantity || 0,
      paymentMethod: p?.paymentMethod || 'Cash',
      remark: p?.remark || ''
    };
  }).sort((a, b) => (parseInt(a.slNo, 10) || 0) - (parseInt(b.slNo, 10) || 0));

  const present = students.filter(s => s.present);
  const absent = students.filter(s => !s.present);
  const newStudents = newStudentsRaw.map(s => ({ 
    ...s, 
    present: presentMap.has(s.slNo) 
  })).sort((a, b) => (parseInt(a.slNo, 10) || 0) - (parseInt(b.slNo, 10) || 0));

  const { district, place } = req.user;
  const admin = await Admin.findOne({ 
    district: { $regex: new RegExp(`^${district}$`, "i") },
    place: { $regex: new RegExp(`^${place}$`, "i") },
    role: "admin"
  }).lean();
  const defaultMessage = admin?.welcomeMessage || "జై శ్రీమన్నారాయణ! ఈ రోజు సెషన్‌కు హాజరైనందుకు ధన్యవాదాలు.";

  res.json({
    date: normalizedDate,
    total: students.length,
    presentCount: present.length,
    absentCount: absent.length,
    message: metadata.message || defaultMessage,
    whatsappLink: metadata.whatsappLink || admin?.whatsappLink || "",
    openingStock: metadata.openingStock || 0,
    previousOpeningStock,
    previousSoldStock,
    previousRemainingStock,
    hasAttendance: attendanceRaw.length > 0,
    students,
    present,
    absent,
    newStudents,
  });
});

attendanceRouter.post("/:date/save", async (req, res) => {
  const { Student, Attendance } = req.tenantModels;
  const { district, place, username } = req.user;
  
  const date = normalizeDateParam(req.params.date);
  if (!date) return res.status(400).json({ error: "Invalid date" });

  const schema = z.object({
    presentStudents: z.array(z.object({
      slNo: z.union([z.string(), z.number()]),
      paymentMethod: z.enum(["Cash", "Online", "Free", "Online Payment"]).default("Cash"),
      quantity: z.number().int().min(0).default(0),
      remark: z.string().optional().default(""),
    })).default([]),
    message: z.string().optional().default(""),
    whatsappLink: z.string().optional().default(""),
    openingStock: z.number().int().min(0).default(0),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const allStudents = await Student.find({}).lean();
  const studentMap = new Map(allStudents.map(s => [String(s.slNo), s]));
  
  const enrichedPresent = parsed.data.presentStudents.map(p => {
    const slNoStr = String(p.slNo);
    const student = studentMap.get(slNoStr) || {};
    return {
      date,
      type: "student",
      slNo: Number(p.slNo),
      name: student.name || "",
      fatherName: student.fatherName || "",
      phone: student.phone || "",
      paymentMethod: p.paymentMethod || "Cash",
      quantity: p.quantity || 0,
      remark: p.remark || "",
      district,
      place
    };
  });

  const metadataDoc = {
    date,
    type: "metadata",
    message: parsed.data.message,
    whatsappLink: parsed.data.whatsappLink,
    openingStock: parsed.data.openingStock,
    district,
    place
  };

  // Delete all existing attendance records for this date
  await Attendance.deleteMany({ date });

  // Insert normalized records
  if (enrichedPresent.length > 0) {
    await Attendance.insertMany(enrichedPresent);
  }
  await Attendance.create(metadataDoc);

  // Update the Admin's default whatsappLink and message too if provided
  if (parsed.data.whatsappLink || parsed.data.message) {
    const update = {};
    if (parsed.data.whatsappLink) update.whatsappLink = parsed.data.whatsappLink;
    if (parsed.data.message) update.welcomeMessage = parsed.data.message;
    await Admin.updateOne({ district, place, role: "admin" }, { $set: update });
  }

  res.json({ ok: true });
});

// POST /api/attendance/:date/notify-absent
// Sends a WhatsApp message to all absent students for the given date.
attendanceRouter.post('/:date/notify-absent', async (req, res) => {
  const { Student, Attendance } = req.tenantModels;
  const { district, place, username } = req.user;
  const date = normalizeDateParam(req.params.date);
  if (!date) return res.status(400).json({ error: 'Invalid date' });

  // Retrieve admin for default messages
  const admin = await Admin.findOne({
    district: { $regex: new RegExp(`^${district}$`, "i") },
    place: { $regex: new RegExp(`^${place}$`, "i") },
    role: "admin"
  }).lean();
  const defaultAbsentMessage = admin?.absentMessage || "శ్రీమన్నారాయణ! ఈ రోజు మీరు స్వర్ణామృత ప్రాశనకు హాజరు కాలేదు. దయచేసి తదుపరి కార్యక్రమానికి హాజరుకాగలరు.";
  const message = req.body.message || defaultAbsentMessage;

  // Build absent list
  const allStudents = await Student.find({}).lean();
  const attendanceDocs = await Attendance.find({ date, type: 'student' }).lean();
  const presentSet = new Set(attendanceDocs.map(a => String(a.slNo)));
  const absentStudents = allStudents.filter(s => !presentSet.has(String(s.slNo)) && s.phone);

  try {
    const tenantId = req.user.username;
    const results = await Promise.all(absentStudents.map(s =>
      sendWhatsAppMessage(tenantId, s.phone, message)
        .then(r => ({ slNo: s.slNo, phone: s.phone, result: r }))
        .catch(err => ({ slNo: s.slNo, phone: s.phone, error: err.message }))
    ));
    res.json({ sent: results.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

attendanceRouter.get("/list/history", async (req, res) => {
  const { Student, Attendance } = req.tenantModels;
  try {
    const [allMetadata, totalStudents] = await Promise.all([
      Attendance.find({ type: "metadata" }).sort({ date: -1 }).lean(),
      Student.countDocuments({})
    ]);

    const history = await Promise.all(allMetadata.map(async (meta) => {
      const studentDocs = await Attendance.find({ date: meta.date, type: "student" }).sort({ slNo: 1 }).lean();
      
      const presentCount = studentDocs.length;
      const totalSold = studentDocs.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0);
      
      const stats = studentDocs.reduce((acc, p) => {
        const qty = Number(p.quantity) || 0;
        const method = p.paymentMethod || "Cash";

        if (method === "Cash") { acc.cashQty += qty; acc.cashAmount += qty * 70; }
        else if (method === "Online" || method === "Online Payment") { acc.onlineQty += qty; acc.onlineAmount += qty * 70; }
        else if (method === "Free") { acc.freeQty += qty; }
        return acc;
      }, { cashQty: 0, cashAmount: 0, onlineQty: 0, onlineAmount: 0, freeQty: 0 });

      return {
        date: meta.date,
        presentCount,
        absentCount: Math.max(0, totalStudents - presentCount),
        totalSold,
        revenue: stats.cashAmount + stats.onlineAmount,
        stats
      };
    }));

    // Filter out dates that have no attendance marked (only metadata saved but no students)
    const activeHistory = history.filter(h => h.presentCount > 0);
    res.json(activeHistory);
  } catch (err) {
    console.error("[History List Error]", err);
    res.status(500).json({ error: err.message });
  }
});

attendanceRouter.get("/:date/download", async (req, res) => {
  const { Student, Attendance } = req.tenantModels;
  try {
    const normalizedDate = normalizeDateParam(req.params.date);
    if (!normalizedDate) return res.status(400).json({ error: "Invalid date" });

    const [studentsRaw, attendanceRaw] = await Promise.all([
      Student.find({}).sort({ slNo: 1 }).lean(),
      Attendance.find({ date: normalizedDate }).sort({ slNo: 1 }).lean()
    ]);

    const metadata = attendanceRaw.find(d => d.type === "metadata") || {};
    const presentDocs = attendanceRaw.filter(d => d.type === "student");
    const presentMap = new Map(presentDocs.map(p => [p.slNo, p]));

    const students = studentsRaw.map(s => {
      const p = presentMap.get(s.slNo);
      return {
        ...s,
        present: !!p,
        paymentMethod: p?.paymentMethod || "Cash",
        quantity: p?.quantity || 0,
        remark: p?.remark || ""
      };
    }).sort((a, b) => Number(a.slNo) - Number(b.slNo));

    const present = students.filter(s => s.present);
    const absent = students.filter(s => !s.present);
    
    // For "New Students" sheet, we just filter current day registrations
    // For "New Students" sheet, we filter students created on that day
    const startOfDay = dayjs(normalizedDate).startOf('day').subtract(1, 'hour').toDate();
    const endOfDay = dayjs(normalizedDate).endOf('day').add(1, 'hour').toDate();
    const newStudentsRaw = await Student.find({ createdAt: { $gte: startOfDay, $lte: endOfDay } }).lean();
    const newStudentsWithStatus = newStudentsRaw.map(s => {
      const p = presentMap.get(s.slNo);
      return {
        ...s,
        present: !!p,
        paymentMethod: p?.paymentMethod || "Cash",
        quantity: p?.quantity || 0,
        remark: p?.remark || ""
      };
    }).sort((a, b) => Number(a.slNo) - Number(b.slNo));

    const buf = buildAttendanceWorkbook({ 
      date: normalizedDate, 
      present, 
      absent, 
      newStudents: newStudentsWithStatus,
      openingStock: metadata.openingStock || 0
    });
    const filename = `attendance_${normalizedDate}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buf);
  } catch (err) {
    console.error("[Excel Export Error]", err);
    res.status(500).json({ error: "Failed to generate Excel file" });
  }
});

attendanceRouter.get("/student/:slNo", async (req, res) => {
  const { Attendance } = req.tenantModels;
  const { slNo } = req.params;
  
  const studentAttendance = await Attendance.find({ 
    type: "student",
    slNo: slNo
  }).sort({ date: -1 }).lean();

  const history = studentAttendance.map(att => {
    return {
      date: att.date,
      present: true,
      quantity: att.quantity || 0,
      paymentMethod: att.paymentMethod,
      remark: att.remark
    };
  });

  // Only show dates where the student was actually present to avoid confusion with erroneous dates
  const fullLog = history;

  res.json({ slNo, history: fullLog });
});

module.exports = { attendanceRouter };
