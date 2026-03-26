const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load .env
dotenv.config({ path: path.join(__dirname, "../.env") });

const { connectDb, getTenantDb } = require("./lib/db");
const { getTenantModels } = require("./lib/tenantModels");
const StudentGlobal = require("./models/Student");
const AttendanceGlobal = require("./models/Attendance");

async function migrate() {
  try {
    console.log("Starting Migration to Tenant Databases...");
    await connectDb();

    // 1. Migrate Students
    const allStudents = await StudentGlobal.find({}).lean();
    console.log(`Found ${allStudents.length} students in global database.`);

    const studentsByAdmin = {};
    allStudents.forEach(s => {
      const admin = s.createdBy || "unknown";
      if (!studentsByAdmin[admin]) studentsByAdmin[admin] = [];
      studentsByAdmin[admin].push(s);
    });

    for (const [admin, students] of Object.entries(studentsByAdmin)) {
      console.log(`Migrating ${students.length} students to tenant: ${admin}...`);
      const tenantDb = getTenantDb(admin);
      const { Student } = getTenantModels(tenantDb);
      
      // Clear existing to avoid duplicates if re-run
      await Student.deleteMany({});
      
      // Remove _id and __v to allow new generation or keep _id? 
      // Better to keep _id if attendance references it.
      await Student.insertMany(students);
    }

    // 2. Migrate Attendance
    const allAttendance = await AttendanceGlobal.find({}).lean();
    console.log(`Found ${allAttendance.length} attendance records in global database.`);

    const attendanceByAdmin = {};
    allAttendance.forEach(a => {
      const admin = a.createdBy || "unknown";
      if (!attendanceByAdmin[admin]) attendanceByAdmin[admin] = [];
      attendanceByAdmin[admin].push(a);
    });

    for (const [admin, records] of Object.entries(attendanceByAdmin)) {
      console.log(`Migrating ${records.length} records to tenant: ${admin}...`);
      const tenantDb = getTenantDb(admin);
      const { Attendance } = getTenantModels(tenantDb);
      
      await Attendance.deleteMany({});
      await Attendance.insertMany(records);
    }

    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (err) {
    if (err.name === 'ValidationError') {
      console.error("Validation Error Details:", JSON.stringify(err.errors, null, 2));
    } else {
      console.error("Migration FAILED:", err);
    }
    process.exit(1);
  }
}

migrate();
