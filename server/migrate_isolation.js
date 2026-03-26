const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const Student = require("./src/models/Student");
const Attendance = require("./src/models/Attendance");

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const district = "Karimnagar";
    const place = "Huzurabad";

    const studentResult = await Student.updateMany(
      { district: { $exists: false } },
      { $set: { district, place } }
    );
    console.log(`Updated ${studentResult.modifiedCount} students`);

    const attendanceResult = await Attendance.updateMany(
      { district: { $exists: false } },
      { $set: { district, place } }
    );
    console.log(`Updated ${attendanceResult.modifiedCount} attendance records`);

    console.log("Migration complete");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
