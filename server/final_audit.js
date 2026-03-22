const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Run from server directory
dotenv.config();

async function checkMaxSlNo() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/vikasatarangini";
  await mongoose.connect(uri);
  
  const Student = mongoose.model("Student", new mongoose.Schema({ slNo: String }, { strict: false }), "students");
  const Attendance = mongoose.model("Attendance", new mongoose.Schema({}, { strict: false }), "attendances");
  
  const students = await Student.find({}, { slNo: 1 }).sort({ slNo: 1 });
  const slNos = students.map(s => parseInt(s.slNo)).filter(n => !isNaN(n)).sort((a,b) => a-b);
  const max = slNos.length > 0 ? slNos[slNos.length - 1] : 0;
  const count = slNos.length;
  
  const attCount = await Attendance.countDocuments({});
  
  console.log(`Current Student Count: ${count}`);
  console.log(`Highest Serial No (SlNo): ${max}`);
  console.log(`Total Attendance Records: ${attCount}`);
  
  if (max >= 494) {
    console.log("WAIT! There are still students with SlNo 494 or higher. Cleaning them now...");
    const res = await Student.deleteMany({ $expr: { $gte: [{ $toInt: "$slNo" }, 494] } });
    console.log(`Deleted ${res.deletedCount} extra records.`);
  } else {
    console.log("CONFIRMED: All records 494 and above are gone.");
  }

  await mongoose.disconnect();
}

checkMaxSlNo().catch(err => {
  console.error(err);
  process.exit(1);
});
