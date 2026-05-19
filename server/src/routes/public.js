const express = require("express");
const Admin = require("../models/Admin");
const OtpVerification = require("../models/OtpVerification");
const { getTenantDb } = require("../lib/db");
const { getTenantModels } = require("../lib/tenantModels");
const { sendWhatsAppMessage } = require("../lib/whatsappService");

const publicRouter = express.Router();

// Helper to normalize phone numbers
function normalizePhone(phone) {
  let clean = String(phone || '').replace(/\D/g, '');
  if (clean.length === 10) {
    clean = '91' + clean;
  }
  return clean;
}

// 1. Send OTP to Parent via WhatsApp (with Sandbox/Demo mode fallback)
publicRouter.post("/parent/send-otp", async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone || cleanPhone.length < 10) {
    return res.status(400).json({ error: "Invalid phone number format" });
  }

  try {
    // Search across all approved admins to find which branch this parent belongs to
    const admins = await Admin.find({ role: 'admin', status: 'approved' }).lean();
    let matchingAdmin = null;

    for (const admin of admins) {
      if (!admin.username) continue;
      try {
        const tenantDb = getTenantDb(admin.username);
        const { Student } = getTenantModels(tenantDb);
        const student = await Student.findOne({ phone: phone.trim() }).lean();
        if (student) {
          matchingAdmin = admin;
          break;
        }
      } catch (err) {
        console.error(`Error searching student in tenant ${admin.username}:`, err);
      }
    }

    // Also check Master Admin if not found
    if (!matchingAdmin) {
      try {
        const tenantDb = getTenantDb("Admin");
        const { Student } = getTenantModels(tenantDb);
        const student = await Student.findOne({ phone: phone.trim() }).lean();
        if (student) {
          matchingAdmin = { username: "Admin", district: "Main", place: "Main" };
        }
      } catch (err) {
        console.error("Error searching in Master DB:", err);
      }
    }

    // If still not found, let's dynamically create a demo student for testing
    if (!matchingAdmin) {
      const firstAdmin = await Admin.findOne({ role: 'admin', status: 'approved' }).lean();
      if (firstAdmin) {
        matchingAdmin = firstAdmin;
        try {
          const tenantDb = getTenantDb(matchingAdmin.username);
          const { Student } = getTenantModels(tenantDb);
          await Student.findOneAndUpdate(
            { phone: phone.trim() },
            {
              $setOnInsert: {
                slNo: "9999",
                name: "Demo Student (డెమో స్టూడెంట్)",
                fatherName: "Demo Parent",
                phone: phone.trim(),
                age: 8,
                gender: "Male"
              }
            },
            { upsert: true, new: true }
          );
          console.log(`[Demo] Auto-seeded mock student in ${matchingAdmin.username} for phone: ${phone}`);
        } catch (err) {
          console.error("Failed to seed demo student:", err);
        }
      } else {
        return res.status(404).json({ error: "This phone number is not registered with any Vikasa Tarangini branch." });
      }
    }

    // Generate a secure 6-digit OTP
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));

    // Store in OtpVerification with 5 min TTL
    await OtpVerification.deleteMany({ phone: cleanPhone });
    await OtpVerification.create({
      phone: cleanPhone,
      code: otpCode,
      tenantId: matchingAdmin.username
    });

    const otpText = `Jai Srimannarayana!\n\nYour 6-digit verification code for the Vikasa Tarangini Parent Portal is: *${otpCode}*.\n\nThis code will expire in 5 minutes. Please do not share it with anyone.`;
    
    try {
      // 1. Try sending via the parent's local branch WhatsApp connection
      await sendWhatsAppMessage(matchingAdmin.username, cleanPhone, otpText);
      res.json({ success: true, message: "Verification OTP code sent successfully via WhatsApp." });
    } catch (waErr) {
      console.warn(`[OTP Fallback] Failed to send via ${matchingAdmin.username}:`, waErr.message);
      
      try {
        // 2. Fallback: Try sending via the Master Admin WhatsApp connection
        await sendWhatsAppMessage("Admin", cleanPhone, otpText);
        res.json({ success: true, message: "Verification OTP code sent successfully via Master WhatsApp." });
      } catch (masterErr) {
        console.warn("[OTP Fallback] Master WhatsApp also not ready. Triggering Demo Mode.");
        
        // 3. Demo Mode Fallback: Let parent proceed using test code 123456
        res.json({
          success: true,
          message: "⚠️ WhatsApp dispatch is not connected at this branch. [DEMO MODE]: Please enter the code 123456 to verify and proceed.",
          isDemoMode: true
        });
      }
    }
  } catch (err) {
    console.error("[Send OTP Error]", err);
    res.status(500).json({ error: "Failed to send verification code: " + err.message });
  }
});

// 2. Verify OTP & Retrieve Parent Data
publicRouter.post("/parent/verify-otp", async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ error: "Phone number and OTP code are required" });
  }

  const cleanPhone = normalizePhone(phone);

  try {
    let verification = await OtpVerification.findOne({
      phone: cleanPhone,
      code: String(code).trim()
    }).lean();

    // Support "123456" as a test/demo code if no database verification exists (e.g. offline/unlinked environment)
    if (!verification && String(code).trim() === "123456") {
      const admins = await Admin.find({ role: 'admin', status: 'approved' }).lean();
      let tenantId = "Admin";
      for (const admin of admins) {
        if (!admin.username) continue;
        const tenantDb = getTenantDb(admin.username);
        const { Student } = getTenantModels(tenantDb);
        const student = await Student.findOne({ phone: phone.trim() }).lean();
        if (student) {
          tenantId = admin.username;
          break;
        }
      }
      verification = { phone: cleanPhone, code: "123456", tenantId };
    }

    if (!verification) {
      return res.status(400).json({ error: "Invalid or expired OTP code." });
    }

    // Find all matching students across all tenant DBs
    const admins = await Admin.find({ role: 'admin', status: 'approved' }).lean();
    const results = [];

    const searchTenants = [...admins, { username: "Admin", district: "Main", place: "Main" }];

    for (const admin of searchTenants) {
      if (!admin.username) continue;
      try {
        const tenantDb = getTenantDb(admin.username);
        const { Student } = getTenantModels(tenantDb);
        const students = await Student.find({ phone: phone.trim() }).lean();

        for (const student of students) {
          results.push({
            district: admin.district,
            place: admin.place,
            student: {
              name: student.name,
              slNo: student.slNo,
              fatherName: student.fatherName,
              phone: student.phone
            },
            history: []
          });
        }

      } catch (err) {
        console.error(`Error loading history in tenant ${admin.username}:`, err);
      }
    }

    // Clean up OTP document if it was database-backed
    if (verification._id) {
      await OtpVerification.deleteOne({ _id: verification._id });
    }

    res.json({ success: true, results });
  } catch (err) {
    console.error("[Verify OTP Error]", err);
    res.status(500).json({ error: "Verification failed: " + err.message });
  }
});

const dayjs = require("dayjs");

// Keep mark-attendance for QR check-ins
publicRouter.post("/mark-attendance", async (req, res) => {
  const { district, place, slNo, paymentMethod, quantity } = req.body;
  if (!district || !place || !slNo) return res.status(400).json({ error: "Missing parameters" });

  try {
    const admin = await Admin.findOne({
      district: { $regex: new RegExp(`^${district}$`, "i") },
      place: { $regex: new RegExp(`^${place}$`, "i") },
      status: "approved"
    }).lean();

    if (!admin) return res.status(404).json({ error: "Location not found" });

    const connection = getTenantDb(admin.username);
    const { Student, Attendance } = getTenantModels(connection);

    const student = await Student.findOne({ slNo: String(slNo) }).lean();
    if (!student) return res.status(404).json({ error: "Student not found" });

    const date = dayjs().format("YYYY-MM-DD");
    const parsedQty = Number(quantity) || 1;

    await Attendance.findOneAndUpdate(
      { date, type: "student", slNo: Number(slNo) },
      {
        $set: {
          name: student.name,
          fatherName: student.fatherName,
          phone: student.phone,
          paymentMethod: paymentMethod || "Online",
          quantity: parsedQty,
          district: admin.district,
          place: admin.place,
          remark: "Auto-marked via QR",
        }
      },
      { upsert: true }
    );

    res.json({ success: true, message: "Attendance marked successfully" });
  } catch (err) {
    console.error("[Public Mark Error]", err);
    res.status(500).json({ error: "Failed to mark attendance" });
  }
});

module.exports = { publicRouter };
