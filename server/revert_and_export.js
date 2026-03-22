const mongoose = require("mongoose");
const dotenv = require("dotenv");
const fs = require("fs");

dotenv.config();

async function revertAndExport() {
  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri);
  
  const Student = mongoose.model("Student", new mongoose.Schema({ slNo: String, name: String }, { strict: false }), "students");
  
  console.log("1. Reverting IDs 411-491 back to 413-493...");
  
  const students = await Student.find({}).sort({ slNo: 1 });
  
  // To avoid unique key conflicts, we use two passes
  // Pass 1: Add prefix to all
  for (const student of students) {
    await Student.updateOne({ _id: student._id }, { $set: { slNo: "REVERT_" + student.slNo } });
  }
  
  // Pass 2: Set final values
  let counter = 1;
  const exportData = [];
  for (const student of students) {
    let finalSlNo = counter.toString();
    if (counter >= 411) {
      finalSlNo = (counter + 2).toString(); // Shift by 2 to skip 411 and 412
    }
    await Student.updateOne({ _id: student._id }, { $set: { slNo: finalSlNo } });
    exportData.push({ slNo: finalSlNo, name: student.name });
    counter++;
  }
  
  console.log("2. Generating CSV...");
  let csvContent = "SlNo,Name\n";
  exportData.forEach(row => {
    csvContent += `${row.slNo},${row.name}\n`;
  });
  
  fs.writeFileSync("students_list.csv", csvContent);
  console.log("3. Done! Reverted IDs and created students_list.csv.");

  await mongoose.disconnect();
}

revertAndExport().catch(err => {
  console.error(err);
  process.exit(1);
});
