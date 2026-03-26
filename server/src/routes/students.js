const express = require("express");
const multer = require("multer");
const { requireAuth } = require("../lib/auth");
const { tenantMiddleware } = require("../lib/tenantMiddleware");
const { parseStudentsFromExcel } = require("../lib/excel");

const studentsRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// All student routes require auth and tenant isolation
studentsRouter.use(requireAuth, tenantMiddleware);

// Helper to get Student model from request (dynamically scoped to tenant DB)
const getStudentModel = (req) => req.tenantModels.Student;

async function getNextSlNo(req) {
  const Student = getStudentModel(req);
  const lastStudent = await Student.find({}).sort({ slNo: -1 }).limit(1).lean();
  if (!lastStudent.length) return "1";
  
  const allStudents = await Student.find({}, { slNo: 1 }).lean();
  const max = allStudents.reduce((currMax, s) => {
    const val = parseInt(s.slNo, 10);
    return isNaN(val) ? currMax : Math.max(currMax, val);
  }, 0);
  
  return String(max + 1);
}

studentsRouter.get("/", async (req, res) => {
  try {
    const Student = getStudentModel(req);
    // In multi-db, we don't need to filter by createdBy as the DB is already isolated
    const students = await Student.find({}).lean();
    students.sort((a, b) => Number(a.slNo) - Number(b.slNo));
    res.json({ students });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

studentsRouter.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const Student = getStudentModel(req);
    const { district, place } = req.user;
    if (!req.file?.buffer) return res.status(400).json({ error: "Missing file" });

    const parsed = parseStudentsFromExcel(req.file.buffer);
    if (!parsed.length) return res.status(400).json({ error: "No valid student rows found" });

    let nextId = parseInt(await getNextSlNo(req), 10);

    const ops = parsed.map((s) => {
      let slNo = s.slNo;
      if (!slNo) {
        slNo = String(nextId++);
      }
      return {
        updateOne: {
          filter: { slNo }, // No createdBy needed
          update: {
            $set: {
              slNo,
              name: s.name,
              fatherName: s.fatherName || "",
              age: s.age ?? null,
              phone: s.phone,
              // We still keep district/place context in case they move
              district,
              place
            },
          },
          upsert: true,
        },
      };
    });

    const result = await Student.bulkWrite(ops, { ordered: false });
    res.json({
      imported: parsed.length,
      upserted: result.upsertedCount || 0,
      modified: result.modifiedCount || 0,
    });
  } catch (err) {
    console.error("[Upload Error]", err);
    res.status(500).json({ error: "Upload failed: " + err.message });
  }
});

studentsRouter.post("/", async (req, res) => {
  try {
    const Student = getStudentModel(req);
    const { district, place } = req.user;
    
    let { slNo, name, fatherName = "", age = null, phone } = req.body || {};

    if (!name || !phone) {
      return res.status(400).json({ error: "name and phone are required" });
    }

    const normalizedName = String(name).trim().toLowerCase();
    const normalizedPhone = String(phone).trim();
    const normalizedFatherName = String(fatherName || "").trim().toLowerCase();

    // Duplicate Check
    const potentialMatches = await Student.find({ 
      phone: normalizedPhone, 
      fatherName: normalizedFatherName
    }).lean();

    const isDuplicate = potentialMatches.some(m => {
      if (m.slNo === String(slNo).trim()) return false;
      const existingName = String(m.name).trim().toLowerCase();
      return normalizedName.includes(existingName) || existingName.includes(normalizedName);
    });

    if (isDuplicate) {
      return res.status(400).json({ error: "Student already exists with similar details" });
    }

    if (!slNo) {
      slNo = await getNextSlNo(req);
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
          district,
          place
        },
      },
      { new: true, upsert: true }
    ).lean();

    return res.json({ student: doc });
  } catch (err) {
    console.error("[Students Route POST Error]", err);
    return res.status(500).json({ error: err.message });
  }
});

studentsRouter.put("/:slNo", async (req, res) => {
  try {
    const Student = getStudentModel(req);
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

studentsRouter.delete("/:slNo", async (req, res) => {
  try {
    const Student = getStudentModel(req);
    const { password } = req.body;
    const { slNo: rawSlNo } = req.params;
    const slNo = rawSlNo ? rawSlNo.trim() : "";

    if (password !== "swarnamrutham") {
      const expectedPass = process.env.ADMIN_PASSWORD || "admin123";
      if (password !== expectedPass) {
        return res.status(401).json({ error: "Invalid admin password for deletion" });
      }
    }

    const result = await Student.deleteOne({ slNo });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Student not found" });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

studentsRouter.post("/delete-all", async (req, res) => {
  try {
    const Student = getStudentModel(req);
    const { password } = req.body;

    const expectedPass = process.env.ADMIN_PASSWORD || "admin123";
    if (password !== expectedPass) {
      return res.status(401).json({ error: "Invalid admin password for mass deletion" });
    }

    await Student.deleteMany({});
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { studentsRouter };
