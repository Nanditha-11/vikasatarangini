const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

async function wipeDatabase() {
  const atlasUri = process.env.MONGODB_URI;
  if (!atlasUri) {
    console.error("MONGODB_URI not found in .env");
    process.exit(1);
  }

  try {
    console.log("Connecting to Atlas DB...");
    await mongoose.connect(atlasUri);
    
    // Define simple models for clearing
    const Student = mongoose.model("Student", new mongoose.Schema({}, { strict: false }), "students");
    const Attendance = mongoose.model("Attendance", new mongoose.Schema({}, { strict: false }), "attendances");

    console.log("Wiping Students collection...");
    const studentRes = await Student.deleteMany({});
    console.log(`Deleted ${studentRes.deletedCount} students.`);

    console.log("Wiping Attendance collection...");
    const attendanceRes = await Attendance.deleteMany({});
    console.log(`Deleted ${attendanceRes.deletedCount} attendance records.`);

    console.log("\nDatabase is now EMPTY and ready for fresh import.");

  } catch (err) {
    console.error("Wipe failed:", err.message);
  } finally {
    await mongoose.disconnect();
  }
}

wipeDatabase();
