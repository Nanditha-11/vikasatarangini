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
  const [studentsRaw, attendance, newStudentsRaw] = await Promise.all([
    Student.find({}).lean(),
    Attendance.findOne({ date }).lean(),
    Student.find({ createdAt: { $gte: startOfDay, $lte: endOfDay } }).lean()
  ]);

  const presentMap = new Map(
    (attendance?.presentStudents || []).map((p) => [p.slNo, { 
      paymentMethod: p.paymentMethod || "Cash", 
      quantity: p.quantity || 0,
      remark: p.remark || "" 
    }])
  );

  const students = [...studentsRaw].sort((a, b) => Number(a.slNo) - Number(b.slNo));
  const newStudents = [...newStudentsRaw]
    .sort((a, b) => Number(a.slNo) - Number(b.slNo))
    .map(s => ({
      ...s,
      present: presentMap.has(s.slNo)
    }));

  const previousAttendance = await Attendance.findOne({ 
    date: { $lt: date }
  }).sort({ date: -1 }).lean();

  let previousRemainingStock = 0;
  let previousOpeningStock = 0;
  let previousSoldStock = 0;
  
  if (previousAttendance) {
    previousSoldStock = (previousAttendance.presentStudents || []).reduce((acc, p) => acc + (Number(p.quantity) || 0), 0);
    previousOpeningStock = previousAttendance.openingStock || 0;
    previousRemainingStock = previousOpeningStock - previousSoldStock;
    if (previousRemainingStock < 0) previousRemainingStock = 0;
  }

  const withStatus = students.map((s) => ({
    ...s,
    present: presentMap.has(s.slNo),
    paymentMethod: presentMap.get(s.slNo)?.paymentMethod || "Cash",
    quantity: presentMap.get(s.slNo)?.quantity || 0,
    remark: presentMap.get(s.slNo)?.remark || "",
  }));

  const present = withStatus.filter((s) => s.present);
  const absent = withStatus.filter((s) => !s.present);

  // Admin remains on the main DB connection
  const admin = await Admin.findOne({ username }).lean();
  const defaultMessage = admin?.welcomeMessage || "Jai Srimannarayana! Thank you for attending the session today!";

  const firstDoc = attendance || {};
  const message = firstDoc.message;
  const whatsappLink = firstDoc.whatsappLink;
  const openingStock = firstDoc.openingStock || 0;

  res.json({
    date,
    total: students.length,
    presentCount: present.length,
    absentCount: absent.length,
    message: message || defaultMessage,
    whatsappLink: whatsappLink || admin?.whatsappLink || "",
    openingStock: openingStock,
    previousOpeningStock,
    previousSoldStock,
    previousRemainingStock,
    hasAttendance: !!attendance,
    students: withStatus,
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
      ...p,
      name: student.name || "",
      fatherName: student.fatherName || "",
      phone: student.phone || ""
    };
  });

  const presentSlNos = new Set(parsed.data.presentStudents.map(p => p.slNo));
  const absentStudents = allStudents
    .filter(s => !presentSlNos.has(s.slNo))
    .map(s => ({ slNo: s.slNo, name: s.name }));

  await Attendance.updateOne(
    { date },
    { $set: { 
      date, 
      presentStudents: enrichedPresent, 
      absentStudents: absentStudents,
      message: parsed.data.message,
      whatsappLink: parsed.data.whatsappLink,
      openingStock: parsed.data.openingStock,
      district,
      place
    } },
    { upsert: true }
  );

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
    const [allAttendance, totalStudents] = await Promise.all([
      Attendance.find({}).sort({ date: -1 }).lean(),
      Student.countDocuments({})
    ]);

    const history = allAttendance.map(att => {
      const presentCount = (att.presentStudents || []).length;
      
      let absentCount = (att.absentStudents || []).length;
      if (absentCount === 0 && presentCount > 0) {
        absentCount = Math.max(0, totalStudents - presentCount);
      }
      
      const stats = (att.presentStudents || []).reduce((acc, p) => {
        const qty = Number(p.quantity) || 0;
        const isOnline = p.paymentMethod === 'Online' || p.paymentMethod === 'Online Payment';
        const isCash = p.paymentMethod === 'Cash';
        const isFree = p.paymentMethod === 'Free';

        if (isCash) { acc.cashQty += qty; acc.cashAmount += qty * 70; }
        else if (isOnline) { acc.onlineQty += qty; acc.onlineAmount += qty * 70; }
        else if (isFree) { acc.freeQty += qty; }
        
        return acc;
      }, { cashQty: 0, cashAmount: 0, onlineQty: 0, onlineAmount: 0, freeQty: 0 });

      return {
        date: att.date,
        presentCount,
        absentCount,
        totalSold: (att.presentStudents || []).reduce((acc, p) => acc + (Number(p.quantity) || 0), 0),
        revenue: stats.cashAmount + stats.onlineAmount,
        stats
      };
    });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

attendanceRouter.get("/:date/download", async (req, res) => {
  const { Student, Attendance } = req.tenantModels;
  try {
    const date = normalizeDateParam(req.params.date);
    if (!date) return res.status(400).json({ error: "Invalid date" });

    const startOfDay = dayjs(date).startOf('day').toDate();
    const endOfDay = dayjs(date).endOf('day').toDate();

    const [studentsRaw, attendance, newStudentsRaw] = await Promise.all([
      Student.find({}).lean(),
      Attendance.findOne({ date }).lean(),
      Student.find({ createdAt: { $gte: startOfDay, $lte: endOfDay } }).lean()
    ]);

    const students = [...studentsRaw].sort((a, b) => Number(a.slNo) - Number(b.slNo));
    const newStudents = [...newStudentsRaw].sort((a, b) => Number(a.slNo) - Number(b.slNo));

    const presentMap = new Map(
      (attendance?.presentStudents || []).map((p) => [p.slNo, { paymentMethod: p.paymentMethod || "Cash", quantity: p.quantity || 0, remark: p.remark || "" }])
    );
    const present = students
      .filter((s) => presentMap.has(s.slNo))
      .map(s => ({ 
        ...s, 
        present: true,
        paymentMethod: presentMap.get(s.slNo)?.paymentMethod, 
        quantity: presentMap.get(s.slNo)?.quantity,
        remark: presentMap.get(s.slNo)?.remark
      }));
    const absent = students.filter((s) => !presentMap.has(s.slNo)).map(s => ({ ...s, present: false }));

    const newStudentsWithStatus = newStudents.map(s => ({
      ...s,
      present: presentMap.has(s.slNo),
      paymentMethod: presentMap.get(s.slNo)?.paymentMethod, 
      quantity: presentMap.get(s.slNo)?.quantity,
      remark: presentMap.get(s.slNo)?.remark
    }));

    const buf = buildAttendanceWorkbook({ 
      date, 
      present, 
      absent, 
      newStudents: newStudentsWithStatus, 
      openingStock: attendance?.openingStock || 0
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
  
  const allAttendance = await Attendance.find({ 
    "presentStudents.slNo": slNo
  }).sort({ date: -1 }).lean();

  const history = allAttendance.map(att => {
    const record = att.presentStudents.find(p => p.slNo === slNo);
    return {
      date: att.date,
      present: true,
      quantity: record.quantity || 0,
      paymentMethod: record.paymentMethod,
      remark: record.remark
    };
  });

  const allDateDocs = await Attendance.find({}, { date: 1 }).sort({ date: -1 }).lean();
  const presentDates = new Set(history.map(h => h.date));
  
  const fullLog = allDateDocs.map(doc => {
    if (presentDates.has(doc.date)) {
      return history.find(h => h.date === doc.date);
    }
    return {
      date: doc.date,
      present: false,
      quantity: 0
    };
  });

  res.json({ slNo, history: fullLog });
});

module.exports = { attendanceRouter };
