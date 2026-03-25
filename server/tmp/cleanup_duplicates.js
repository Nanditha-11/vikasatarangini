const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env from current directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const StudentSchema = new mongoose.Schema({
  slNo: String,
  name: String,
  fatherName: String,
  age: Number,
  phone: String,
});

const Student = mongoose.model('Student', StudentSchema);

async function cleanup() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error("MONGODB_URI not found in .env");

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    const students = await Student.find().lean();
    console.log(`Found ${students.length} total students.`);

    const seen = new Map();
    const toDelete = [];

    for (const s of students) {
      if (!s.name || !s.phone) continue;
      
      const key = `${s.name.trim().toLowerCase()}|${(s.fatherName || "").trim().toLowerCase()}|${String(s.phone).trim()}`;
      if (seen.has(key)) {
        toDelete.push(s._id);
      } else {
        seen.set(key, s.slNo);
      }
    }

    if (toDelete.length > 0) {
      console.log(`Found ${toDelete.length} duplicates to remove.`);
      const result = await Student.deleteMany({ _id: { $in: toDelete } });
      console.log(`Successfully deleted ${result.deletedCount} duplicate students.`);
    } else {
      console.log("No duplicates found.");
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Error during cleanup:", err);
    process.exit(1);
  }
}

cleanup();
