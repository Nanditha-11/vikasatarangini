const mongoose = require("mongoose");

async function checkLocal() {
  const localUri = "mongodb://localhost:27017/vikasatarangini";
  try {
    await mongoose.connect(localUri);
    const Student = mongoose.model("Student", new mongoose.Schema({ slNo: String, name: String }, { strict: false }), "students");
    
    const count = await Student.countDocuments();
    console.log(`Local Student Count: ${count}`);
    
    const students = await Student.find({}, { slNo: 1, name: 1 }).sort({ slNo: 1 }).lean();
    const slNoSet = new Set(students.map(s => parseInt(s.slNo)));
    
    const missing = [];
    for (let i = 1; i <= 493; i++) {
      if (!slNoSet.has(i)) missing.push(i);
    }
    
    console.log("Missing locally:", missing.length === 0 ? "None" : missing.join(", "));
    
    if (count > 0) {
      console.log("First 5 students:");
      console.log(students.slice(0, 5));
    }

  } catch (err) {
    console.error("Local DB error:", err.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkLocal();
