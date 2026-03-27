const express = require("express");
const dayjs = require("dayjs");
const { z } = require("zod");

const { requireAuth } = require("../lib/auth");
const { tenantMiddleware } = require("../lib/tenantMiddleware");
const { buildAttendanceWorkbook } = require("../lib/excel");
const Admin = require("../models/Admin");

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
  const date = normalizeDateParam(req.params.date);
  if (!date) return res.status(400).json({ error: "Invalid date" });

  const startOfDay = dayjs(date).startOf('day').toDate();
  const endOfDay = dayjs(date).endOf('day').toDate();

  // In multi-db, we don't need to filter by createdBy as the DB is already isolated
  const normalizedDate = normalizeDateParam(req.params.date);
  
  // 1. Get current day data
  const [studentsRaw, attendanceRaw, newStudentsRaw] = await Promise.all([
    Student.find({}).lean(),
    Attendance.find({ date: normalizedDate }).lean(),
    Student.find({ createdAt: { $gte: startOfDay, $lte: endOfDay } }).lean()
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
  }).sort((a, b) => Number(a.slNo) - Number(b.slNo));

  const present = students.filter(s => s.present);
  const absent = students.filter(s => !s.present);
  const newStudents = newStudentsRaw.map(s => ({ 
    ...s, 
    present: presentMap.has(s.slNo) 
  })).sort((a, b) => Number(a.slNo) - Number(b.slNo));

  const admin = await Admin.findOne({ username }).lean();
  const defaultMessage = admin?.welcomeMessage || "Jai Srimannarayana! Thank you for attending the session today!";

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
      slNo: z.string().min(1),
      paymentMethod: z.enum(["Cash", "Online", "Free"]).default("Cash"),
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
  const studentMap = new Map(allStudents.map(s => [s.slNo, s]));
  
  const enrichedPresent = parsed.data.presentStudents.map(p => {
    const student = studentMap.get(p.slNo) || {};
    return {
      date,
      type: "student",
      slNo: p.slNo,
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
    await Admin.updateOne({ username }, { $set: update });
  }

  res.json({ ok: true });
});

attendanceRouter.get("/list/history", async (req, res) => {
  const { Student, Attendance } = req.tenantModels;
  try {
    const [allMetadata, totalStudents] = await Promise.all([
      Attendance.find({ type: "metadata" }).sort({ date: -1 }).lean(),
      Student.countDocuments({})
    ]);

    const history = await Promise.all(allMetadata.map(async (meta) => {
      const studentDocs = await Attendance.find({ date: meta.date, type: "student" }).lean();
      
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
      Student.find({}).lean(),
      Attendance.find({ date: normalizedDate }).lean()
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
    const startOfDay = dayjs(normalizedDate).startOf('day').toDate();
    const endOfDay = dayjs(normalizedDate).endOf('day').toDate();
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
    const filename = `attendance_${date}.xlsx`;

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

  // Only show dates where a session actually happened (at least one student was marked present globally)
  const activeDates = await Attendance.distinct("date", { type: "student" });
  const allDates = activeDates.sort((a, b) => b.localeCompare(a));
  const presentDates = new Set(history.map(h => h.date));
  
  const fullLog = allDates.map(d => {
    if (presentDates.has(d)) {
      return history.find(h => h.date === d);
    }
    return {
      date: d,
      present: false,
      quantity: 0
    };
  });

  res.json({ slNo, history: fullLog });
});

module.exports = { attendanceRouter };
