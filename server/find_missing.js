const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Run from server directory
dotenv.config();

async function findMissingSlNo() {
  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri);
  
  const Student = mongoose.model("Student", new mongoose.Schema({ slNo: String }, { strict: false }), "students");
  
  const students = await Student.find({}, { slNo: 1 });
  const slNos = students.map(s => parseInt(s.slNo)).filter(n => !isNaN(n));
  const slNoSet = new Set(slNos);
  
  console.log(`Total students in DB: ${slNos.length}`);
  
  const missing = [];
  for (let i = 1; i <= 493; i++) {
    if (!slNoSet.has(i)) {
      missing.push(i);
    }
  }
  
  if (missing.length > 0) {
    console.log("Missing Serial Numbers (SlNo):", missing.join(", "));
  } else {
    console.log("No serial numbers are missing between 1 and 493.");
  }

  await mongoose.disconnect();
}

findMissingSlNo().catch(err => {
  console.error(err);
  process.exit(1);
});
