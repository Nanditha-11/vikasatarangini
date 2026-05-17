const express = require("express");
const Admin = require("../models/Admin");
const { getTenantDb } = require("../lib/db");
const { getTenantModels } = require("../lib/tenantModels");

const publicRouter = express.Router();

publicRouter.get("/student-history", async (req, res) => {
  const { district, place, identifier } = req.query;

  if (!district || !place || !identifier) {
    return res.status(400).json({ error: "Missing district, place, or identifier" });
  }

  try {
    // 1. Find the admin for this district/place to identify the tenant
    const admin = await Admin.findOne({
      district: { $regex: new RegExp(`^${district}$`, "i") },
      place: { $regex: new RegExp(`^${place}$`, "i") },
      status: "approved"
    }).lean();

    if (!admin) {
      return res.status(404).json({ error: "No sessions found for this location" });
    }

    // 2. Get the tenant DB and models
    const connection = getTenantDb(admin.username);
    const { Student, Attendance } = getTenantModels(connection);

    // 3. Search for student by name OR phone (case-insensitive)
    const searchRegex = new RegExp(`^${identifier?.trim()}$`, "i");
    const students = await Student.find({
      $or: [
        { name: searchRegex },
        { phone: identifier?.trim() }
      ]
    }).lean();

    if (students.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    // If multiple students found, we should probably ask to be more specific or return multiple
    // But usually slNo is unique. Let's return the first one for now or all matches.
    // The requirement says "they should see their data".
    
    const results = await Promise.all(students.map(async (student) => {
      const studentAttendance = await Attendance.find({ 
        type: "student",
        slNo: student.slNo
      }).sort({ date: -1 }).lean();

      const history = studentAttendance.map(att => ({
        date: att.date,
        present: true,
        quantity: att.quantity || 0,
        paymentMethod: att.paymentMethod,
        remark: att.remark
      }));

      // We only show dates where the student was actually present, as per user request
      // to avoid showing dates with no attendance or erroneous dates.
      const fullLog = history;

      return {
        student: {
          name: student.name,
          slNo: student.slNo,
          fatherName: student.fatherName,
          phone: student.phone
        },
        history: fullLog
      };
    }));

    res.json(results);
  } catch (err) {
    console.error("[Public History Error]", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

const dayjs = require("dayjs");

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
