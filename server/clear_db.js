const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Run from server directory
dotenv.config();

async function clear() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/vikasatarangini";
  console.log("Connecting to:", uri);
  await mongoose.connect(uri);
  
  const Student = mongoose.model("Student", new mongoose.Schema({}), "students");
  const Attendance = mongoose.model("Attendance", new mongoose.Schema({}), "attendances");
  
  const resultS = await Student.deleteMany({});
  const resultA = await Attendance.deleteMany({});
  
  console.log(`Deleted ${resultS.deletedCount} students.`);
  console.log(`Deleted ${resultA.deletedCount} attendance records.`);
  
  await mongoose.disconnect();
}

clear().catch(err => {
  console.error(err);
  process.exit(1);
});
