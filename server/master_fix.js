const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

async function masterFix() {
  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri);
  
  const Student = mongoose.model("Student", new mongoose.Schema({ slNo: String }, { strict: false }), "students");
  
  console.log("1. Deleting student 411 and TEMP_411...");
  await Student.deleteMany({ slNo: { $in: ["411", "TEMP_411"] } });
  
  console.log("2. Fetching all students...");
  const students = await Student.find({});
  
  // 3. Normalize all slNo: strip TEMP_ and parse as integer
  const normalized = students.map(s => {
    let raw = s.slNo.replace("TEMP_", "");
    return { _id: s._id, oldSlNo: s.slNo, num: parseInt(raw) };
  }).sort((a, b) => a.num - b.num);

  console.log("4. Pass 1: Assigning new temporary placeholders...");
  for (let i = 0; i < normalized.length; i++) {
    await Student.updateOne({ _id: normalized[i]._id }, { $set: { slNo: "FINAL_TEMP_" + i } });
  }

  console.log("5. Pass 2: Assigning final continuous IDs...");
  for (let i = 0; i < normalized.length; i++) {
    const finalId = (i + 1).toString();
    await Student.updateOne({ _id: normalized[i]._id }, { $set: { slNo: finalId } });
  }
  
  console.log(`6. Done! Re-indexed ${normalized.length} students from 1 to ${normalized.length}.`);

  await mongoose.disconnect();
}

masterFix().catch(err => {
  console.error(err);
  process.exit(1);
});
