const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

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
    if (!mongoUri) throw new Error("MONGODB_URI not found");

    await mongoose.connect(mongoUri);
    const students = await Student.find().lean();
    console.log(`Checking ${students.length} students for partial name duplicates...`);

    const toDelete = new Set();
    const groups = {};

    // Group by Phone and FatherName
    for (const s of students) {
        if (!s.name || !s.phone) continue;
        const key = `${s.phone.trim()}|${(s.fatherName || "").trim().toLowerCase()}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
    }

    for (const key in groups) {
      const list = groups[key];
      if (list.length < 2) continue;

      // Sort by length to keep the most "complete" name if possible, 
      // or just keep the first one. Let's keep the one with lowest slNo.
      list.sort((a, b) => parseInt(a.slNo) - parseInt(b.slNo));

      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const nameI = list[i].name.trim().toLowerCase();
          const nameJ = list[j].name.trim().toLowerCase();
          
          if (nameI.includes(nameJ) || nameJ.includes(nameI)) {
            // Found a partial name duplicate. Mark the second one for deletion.
            toDelete.add(list[j]._id.toString());
          }
        }
      }
    }

    if (toDelete.size > 0) {
      console.log(`Deleting ${toDelete.size} partial name duplicates...`);
      const result = await Student.deleteMany({ _id: { $in: Array.from(toDelete).map(id => new mongoose.Types.ObjectId(id)) } });
      console.log(`Cleaned up ${result.deletedCount} students.`);
    } else {
      console.log("No partial duplicates found.");
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

cleanup();
