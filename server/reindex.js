const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Run from server directory
dotenv.config();

async function reindexStudents() {
  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri);
  
  const Student = mongoose.model("Student", new mongoose.Schema({ slNo: String }, { strict: false }), "students");
  
  // 1. Delete student 411
  console.log("Deleting student 411...");
  await Student.deleteOne({ slNo: "411" });
  
  // 2. Fetch all remaining students sorted by current slNo
  console.log("Fetching all students...");
  const students = await Student.find({}).sort({ slNo: 1 });
  
  // 3. First Pass: Assign temporary prefix to avoid unique index conflicts
  console.log("Pass 1: Assigning temporary IDs...");
  for (const student of students) {
    await Student.updateOne({ _id: student._id }, { $set: { slNo: "TEMP_" + student.slNo } });
  }

  // 4. Second Pass: Assign final sequential IDs
  console.log("Pass 2: Assigning final sequential IDs...");
  let counter = 1;
  for (const student of students) {
    const newSlNo = counter.toString();
    await Student.updateOne({ _id: student._id }, { $set: { slNo: newSlNo } });
    counter++;
  }
  
  console.log(`Successfully re-indexed ${students.length} students. They are now 1 to ${counter - 1}.`);

  await mongoose.disconnect();
}

reindexStudents().catch(err => {
  console.error(err);
  process.exit(1);
});
