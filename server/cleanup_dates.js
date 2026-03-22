const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Run from server directory
dotenv.config();

async function clearSpecific() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/vikasatarangini";
  console.log("Connecting to:", uri);
  await mongoose.connect(uri);
  
  const Student = mongoose.model("Student", new mongoose.Schema({ slNo: String }, { strict: false }), "students");
  const Attendance = mongoose.model("Attendance", new mongoose.Schema({}, { strict: false }), "attendances");
  
  console.log("Clearing ALL attendance history...");
  const resultA = await Attendance.deleteMany({});
  console.log(`Deleted ${resultA.deletedCount} total attendance records.`);

  console.log("Removing sample students with SlNo 494 and above...");
  // Use numeric comparison for slNo string
  const resultS = await Student.deleteMany({
    $expr: { $gte: [{ $toInt: "$slNo" }, 494] }
  });
  
  console.log(`Deleted ${resultS.deletedCount} sample student records. System is now reset to 493 students.`);
  
  // Also clear the "494" - if it means ALL attendance, the user said "clear all attendance data ALSO 22-03 and 24-03"
  // If "all" means everything:
  // const resultAll = await Attendance.deleteMany({});
  // console.log(`Deleted ${resultAll.deletedCount} total attendance records.`);

  await mongoose.disconnect();
}

clearSpecific().catch(err => {
  console.error(err);
  process.exit(1);
});
