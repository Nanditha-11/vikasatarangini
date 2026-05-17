const express = require("express");
const multer = require("multer");
const { requireAuth } = require("../lib/auth");
const { tenantMiddleware } = require("../lib/tenantMiddleware");
const { parseStudentsFromExcel } = require("../lib/excel");
const Admin = require("../models/Admin");
const { getTenantDb } = require("../lib/db");
const { getTenantModels } = require("../lib/tenantModels");

const studentsRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });


// Global Inquiry - Search across ALL locations by phone
// Must be BEFORE tenantMiddleware to allow cross-tenant search
studentsRouter.get("/inquiry/:phone", requireAuth, async (req, res) => {
  try {
    const { phone } = req.params;
    const normalizedPhone = String(phone).trim();

    // 1. Get all approved admins to search their databases
    const admins = await Admin.find({ role: 'admin', status: 'approved' }).lean();
    
    // 2. Results to collect
    const results = [];

    // 3. Search each tenant DB
    for (const admin of admins) {
      if (!admin.username) continue;
      
      try {
        const tenantDb = getTenantDb(admin.username);
        const { Student, Attendance } = getTenantModels(tenantDb);
        // Find ALL students with this phone (e.g. siblings)
        const matchingStudents = await Student.find({ phone: normalizedPhone }).lean();
        
        for (const student of matchingStudents) {
          // Check if we already found this exact student (same name and phone) to avoid showing them multiple times
          const duplicate = results.find(r => 
            r.studentName.toLowerCase() === student.name.toLowerCase() && 
            String(r.phone) === String(student.phone)
          );
          if (duplicate) continue;

          const history = await Attendance.find({ 
            slNo: student.slNo, 
            type: 'student' 
          }).sort({ date: -1 }).lean();

          results.push({
            district: admin.district,
            place: admin.place,
            studentName: student.name,
            slNo: student.slNo,
            fatherName: student.fatherName,
            age: student.age,
            phone: student.phone, // Include phone in result for duplicate check
            history: history.map(h => ({
              date: h.date,
              quantity: h.quantity,
              paymentMethod: h.paymentMethod,
              remark: h.remark
            }))
          });
        }
      } catch (e) {
        console.error(e);
      }
    }

    res.json({ results });
  } catch (err) {
    console.error("[GlobalInquiry Error]", err);
    res.status(500).json({ error: err.message });
  }
});

// QUICK IMPORT ONLY - Register visiting student without marking yet
studentsRouter.post("/import-only", requireAuth, tenantMiddleware, async (req, res) => {
  try {
    const Student = req.tenantModels.Student;
    const { name, fatherName, age, phone, originPlace, originDistrict } = req.body;
    const { district, place } = req.user;

    const nextSlNo = await getNextSlNo(req);

    const student = await Student.findOneAndUpdate(
      { phone: String(phone).trim() },
      {
        $set: {
          slNo: nextSlNo,
          name: name,
          fatherName: fatherName,
          age: age,
          phone: String(phone).trim(),
          district,
          place,
          isVisiting: true,
          originPlace: originPlace || "",
          originDistrict: originDistrict || ""
        }
      },
      { new: true, upsert: true }
    );

    res.json({ success: true, student });
  } catch (err) {
    console.error("[ImportOnly Error]", err);
    res.status(500).json({ error: err.message });
  }
});

// QUICK IMPORT AND MARK - For visiting students
studentsRouter.post("/import-and-mark", requireAuth, tenantMiddleware, async (req, res) => {
  try {
    const Student = req.tenantModels.Student;
    const Attendance = req.tenantModels.Attendance;
    const { name, fatherName, age, phone } = req.body;
    const { district, place } = req.user;

    // 1. Get next serial no
    const nextSlNo = await getNextSlNo(req);

    // 2. Create local student
    const student = await Student.findOneAndUpdate(
      { phone: String(phone).trim() }, // Check if already exist by phone
      {
        $set: {
          slNo: nextSlNo,
          name: name,
          fatherName: fatherName,
          age: age,
          phone: String(phone).trim(),
          district,
          place
        }
      },
      { new: true, upsert: true }
    );

    // 3. Mark present for today
    const now = new Date();
    const today = [
      String(now.getDate()).padStart(2, '0'),
      String(now.getMonth() + 1).padStart(2, '0'),
      now.getFullYear()
    ].join('-'); // DD-MM-YYYY

    await Attendance.findOneAndUpdate(
      { slNo: student.slNo, date: today, type: 'student' },
      {
        $set: {
          present: true,
          quantity: 1,
          paymentMethod: 'Cash',
          studentName: student.name,
          phone: student.phone,
          district,
          place
        }
      },
      { upsert: true }
    );

    res.json({ success: true, student });
  } catch (err) {
    console.error("[ImportAndMark Error]", err);
    res.status(500).json({ error: err.message });
  }
});

// All other student routes require auth and tenant isolation
studentsRouter.use(requireAuth, tenantMiddleware);

// Helper to get Student model from request (dynamically scoped to tenant DB)
const getStudentModel = (req) => req.tenantModels.Student;

function toTitleCase(str) {
  if (!str) return "";
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .trim();
}

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
    const students = await Student.find({}).sort({ slNo: 1 }).lean();
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
      let slNo = s.slNo ? parseInt(s.slNo, 10) : nextId++;
      if (isNaN(slNo)) slNo = nextId++;
      return {
        updateOne: {
          filter: { slNo }, // No createdBy needed
          update: {
            $set: {
              slNo,
              name: toTitleCase(s.name),
              fatherName: toTitleCase(s.fatherName),
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
    const numericSlNo = slNo ? parseInt(slNo, 10) : parseInt(await getNextSlNo(req), 10);
    
    if (!name || !phone) {
      return res.status(400).json({ error: "name and phone are required" });
    }

    const normalizedName = String(name).trim().toLowerCase();
    const normalizedPhone = String(phone).trim();
    const normalizedFatherName = String(fatherName || "").trim().toLowerCase();

    // Escape regex characters to avoid crashes with names like "Name (Place)"
    const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedName = escapeRegExp(String(name).trim());
    const escapedFatherName = escapeRegExp(String(fatherName || "").trim());

    // Duplicate Check - only if Name, Father Name, and Phone are ALL identical
    const isDuplicate = await Student.findOne({ 
      name: { $regex: new RegExp(`^${escapedName}$`, "i") },
      fatherName: { $regex: new RegExp(`^${escapedFatherName}$`, "i") },
      phone: normalizedPhone,
      slNo: { $ne: numericSlNo }
    }).lean();

    if (isDuplicate) {
      return res.status(400).json({ error: "Student already exists with these exact details" });
    }

    const doc = await Student.findOneAndUpdate(
      { slNo: numericSlNo },
      {
        $set: {
          slNo: numericSlNo,
          name: toTitleCase(name),
          fatherName: toTitleCase(fatherName),
          age: Number.isFinite(Number(age)) ? Number(age) : null,
          phone: String(phone).trim(),
          district,
          place
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
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

    // Check against current admin's password OR master password
    const admin = await Admin.findOne({ 
      username: { $regex: new RegExp(`^${req.user.username}$`, "i") },
      district: req.user.district,
      place: req.user.place
    }).lean();
    const isMasterPass = password === "swarnamrutham";
    const isAdminPass = admin && password === admin.password;

    if (!isMasterPass && !isAdminPass) {
      return res.status(401).json({ error: "Incorrect user login password" });
    }

    if (!name || !phone) {
      return res.status(400).json({ error: "Name and Phone are required" });
    }

    const updated = await Student.findOneAndUpdate(
      { slNo },
      {
        $set: {
          name: toTitleCase(name),
          fatherName: toTitleCase(fatherName),
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

    // Check against current admin's password OR master password
    const admin = await Admin.findOne({ 
      username: { $regex: new RegExp(`^${req.user.username}$`, "i") },
      district: req.user.district,
      place: req.user.place
    }).lean();
    const isMasterPass = password === "swarnamrutham";
    const isAdminPass = admin && password === admin.password;

    if (!isMasterPass && !isAdminPass) {
      return res.status(401).json({ error: "Invalid admin password for deletion" });
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

    // Check against current admin's password OR master password
    const admin = await Admin.findOne({ 
      username: { $regex: new RegExp(`^${req.user.username}$`, "i") },
      district: req.user.district,
      place: req.user.place
    }).lean();
    const isMasterPass = password === "swarnamrutham";
    const isAdminPass = admin && password === admin.password;

    if (!isMasterPass && !isAdminPass) {
      return res.status(401).json({ error: "Invalid admin password for mass deletion" });
    }

    await Student.deleteMany({});
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { studentsRouter };
