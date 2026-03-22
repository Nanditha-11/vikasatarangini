const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

async function checkAtlas() {
  const atlasUri = process.env.MONGODB_URI;
  try {
    await mongoose.connect(atlasUri);
    const Student = mongoose.model("Student", new mongoose.Schema({ slNo: String, name: String }, { strict: false }), "students");
    
    const count = await Student.countDocuments();
    console.log(`Atlas Student Count: ${count}`);
    
    const highIds = await Student.find({ $expr: { $gte: [{ $toInt: "$slNo" }, 494] } }).lean();
    console.log(`Students with ID >= 494: ${highIds.length}`);
    if (highIds.length > 0) {
       console.log("Deleting them...");
       const res = await Student.deleteMany({ $expr: { $gte: [{ $toInt: "$slNo" }, 494] } });
       console.log(`Deleted ${res.deletedCount} students.`);
    }

    const finalCount = await Student.countDocuments();
    console.log(`Final Atlas Student Count: ${finalCount}`);

  } catch (err) {
    console.error("Atlas check error:", err.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkAtlas();
