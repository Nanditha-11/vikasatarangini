const express = require("express");
const dayjs = require("dayjs");
const { z } = require("zod");

const { requireAuth } = require("../lib/auth");
const { buildAttendanceWorkbook } = require("../lib/excel");
const Attendance = require("../models/Attendance");

const Student = require("../models/Student");

const attendanceRouter = express.Router();

function normalizeDateParam(dateStr) {
  const d = dayjs(dateStr, ["YYYY-MM-DD", "YYYY/M/D", "YYYY/MM/DD", "YYYY-M-D"], true);
  if (!d.isValid()) return null;
  return d.format("YYYY-MM-DD");
}

attendanceRouter.get("/:date", requireAuth, async (req, res) => {
  const { username } = req.user;
  const date = normalizeDateParam(req.params.date);
  if (!date) return res.status(400).json({ error: "Invalid date" });

  const startOfDay = dayjs(date).startOf('day').toDate();
  const endOfDay = dayjs(date).endOf('day').toDate();

  const query = req.user.role === "master" ? {} : { createdBy: username };

  const [studentsRaw, attendance, newStudentsRaw] = await Promise.all([
    Student.find(query).lean(),
    Attendance.findOne({ date, ...query }).lean(),
    Student.find({ ...query, createdAt: { $gte: startOfDay, $lte: endOfDay } }).lean()
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
    date: { $lt: date },
    ...query 
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

  res.json({
    date,
    total: students.length,
    presentCount: present.length,
    absentCount: absent.length,
    message: attendance?.message || "",
    openingStock: attendance?.openingStock || 0,
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

attendanceRouter.post("/:date/save", requireAuth, async (req, res) => {
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
    openingStock: z.number().int().min(0).default(0),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const query = { createdBy: username };
  const allStudents = await Student.find(query).lean();
  const presentSlNos = new Set(parsed.data.presentStudents.map(p => p.slNo));
  const absentStudents = allStudents
    .filter(s => !presentSlNos.has(s.slNo))
    .map(s => ({ slNo: s.slNo, name: s.name }));

  await Attendance.updateOne(
    { date, createdBy: username },
    { $set: { 
      date, 
      presentStudents: parsed.data.presentStudents, 
      absentStudents: absentStudents,
      message: parsed.data.message,
      openingStock: parsed.data.openingStock,
      district,
      place,
      createdBy: username
    } },
    { upsert: true }
  );

  res.json({ ok: true });
});

attendanceRouter.get("/list/history", requireAuth, async (req, res) => {
  const { username } = req.user;
  const query = req.user.role === "master" ? {} : { createdBy: username };
  try {
    const [allAttendance, totalStudents] = await Promise.all([
      Attendance.find(query).sort({ date: -1 }).lean(),
      Student.countDocuments(query)
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

attendanceRouter.get("/:date/download", requireAuth, async (req, res) => {
  const { username } = req.user;
  const query = req.user.role === "master" ? {} : { createdBy: username };
  try {
    const date = normalizeDateParam(req.params.date);
    if (!date) return res.status(400).json({ error: "Invalid date" });

    const startOfDay = dayjs(date).startOf('day').toDate();
    const endOfDay = dayjs(date).endOf('day').toDate();

    const [studentsRaw, attendance, newStudentsRaw] = await Promise.all([
      Student.find(query).lean(),
      Attendance.findOne({ date, ...query }).lean(),
      Student.find({ ...query, createdAt: { $gte: startOfDay, $lte: endOfDay } }).lean()
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

attendanceRouter.get("/student/:slNo", requireAuth, async (req, res) => {
  const { username } = req.user;
  const query = req.user.role === "master" ? {} : { createdBy: username };
  const { slNo } = req.params;
  
  const allAttendance = await Attendance.find({ 
    "presentStudents.slNo": slNo,
    ...query
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

  const allDateDocs = await Attendance.find(query, { date: 1 }).sort({ date: -1 }).lean();
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

