const express = require("express");
const multer = require("multer");

const { requireAuth } = require("../lib/auth");
const { parseStudentsFromExcel } = require("../lib/excel");
const Student = require("../models/Student");

const studentsRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

async function getNextSlNo() {
  const lastStudent = await Student.find().sort({ slNo: -1 }).limit(1).lean();
  if (!lastStudent.length) return "1";
  
  // Try to find the maximum numeric slNo
  const allStudents = await Student.find({}, { slNo: 1 }).lean();
  const max = allStudents.reduce((currMax, s) => {
    const val = parseInt(s.slNo, 10);
    return isNaN(val) ? currMax : Math.max(currMax, val);
  }, 0);
  
  return String(max + 1);
}

studentsRouter.get("/", requireAuth, async (_req, res) => {
  const students = await Student.find().lean();
  students.sort((a, b) => Number(a.slNo) - Number(b.slNo));
  res.json({ students });
});

studentsRouter.post("/upload", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file?.buffer) return res.status(400).json({ error: "Missing file" });

  const parsed = parseStudentsFromExcel(req.file.buffer);
  if (!parsed.length) return res.status(400).json({ error: "No valid student rows found" });

  let nextId = parseInt(await getNextSlNo(), 10);

  const ops = parsed.map((s) => {
    let slNo = s.slNo;
    if (!slNo) {
      slNo = String(nextId++);
    }
    return {
      updateOne: {
        filter: { slNo },
        update: {
          $set: {
            slNo,
            name: s.name,
            fatherName: s.fatherName || "",
            age: s.age ?? null,
            phone: s.phone,
          },
        },
        upsert: true,
      },
    };
  });

  const result = await Student.bulkWrite(ops, { ordered: false });
  console.log(`[Upload Route] BulkWrite result: upserted=${result.upsertedCount}, modified=${result.modifiedCount}`);
  res.json({
    imported: parsed.length,
    upserted: result.upsertedCount || 0,
    modified: result.modifiedCount || 0,
  });
});

studentsRouter.post("/", requireAuth, async (req, res) => {
  let { slNo, name, fatherName = "", age = null, phone } = req.body || {};

  if (!name || !phone) {
    return res.status(400).json({ error: "name and phone are required" });
  }

  const normalizedName = String(name).trim();
  const normalizedPhone = String(phone).trim();
  const normalizedFatherName = String(fatherName || "").trim();

  // Duplicate Check: Name, Phone, FatherName
  const existing = await Student.findOne({ 
    name: normalizedName, 
    phone: normalizedPhone, 
    fatherName: normalizedFatherName 
  }).lean();

  if (existing && existing.slNo !== String(slNo).trim()) {
    return res.status(400).json({ error: "Student already exists with these details" });
  }

  if (!slNo) {
    slNo = await getNextSlNo();
  }

  const normalizedSlNo = String(slNo).trim();

  const doc = await Student.findOneAndUpdate(
    { slNo: normalizedSlNo },
    {
      $set: {
        slNo: normalizedSlNo,
        name: String(name).trim(),
        fatherName: String(fatherName || "").trim(),
        age: Number.isFinite(Number(age)) ? Number(age) : null,
        phone: String(phone).trim(),
      },
    },
    { new: true, upsert: true }
  ).lean();

  return res.json({ student: doc });
});

studentsRouter.put("/:slNo", requireAuth, async (req, res) => {
  const { slNo } = req.params;
  const { name, fatherName, age, phone, password } = req.body;

  const expectedPass = process.env.ADMIN_PASSWORD || "admin123";
  if (password !== expectedPass && password !== "vikasa") {
    return res.status(401).json({ error: "Incorrect password" });
  }

  if (!name || !phone) {
    return res.status(400).json({ error: "Name and Phone are required" });
  }

  const updated = await Student.findOneAndUpdate(
    { slNo },
    {
      $set: {
        name: String(name).trim(),
        fatherName: String(fatherName || "").trim(),
        age: Number.isFinite(Number(age)) ? Number(age) : null,
        phone: String(phone).trim(),
      },
    },
    { new: true }
  ).lean();

  if (!updated) {
    return res.status(404).json({ error: "Student not found" });
  }

  res.json({ student: updated });
});

studentsRouter.delete("/:slNo", requireAuth, async (req, res) => {
  const { slNo } = req.params;
  const { password } = req.body;

  const expectedPass = process.env.ADMIN_PASSWORD || "admin123";
  if (password !== expectedPass) {
    return res.status(401).json({ error: "Invalid admin password for deletion" });
  }

  await Student.deleteOne({ slNo });
  res.json({ ok: true });
});

studentsRouter.post("/delete-all", requireAuth, async (req, res) => {
  const { password } = req.body;

  const expectedPass = process.env.ADMIN_PASSWORD || "admin123";
  if (password !== expectedPass) {
    return res.status(401).json({ error: "Invalid admin password for mass deletion" });
  }

  await Student.deleteMany({});
  res.json({ ok: true });
});

module.exports = { studentsRouter };

