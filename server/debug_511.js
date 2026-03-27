const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.useDb('vikasatarangini_vikasatarangini');
  
  console.log("Searching for ALL attendance for student 511...");
  const bySl = await db.collection('attendances').find({ slNo: "511" }).toArray();
  console.log(`Found ${bySl.length} records by slNo: "511"`);
  
  console.log("Searching for ALL attendance for date 2026-03-27...");
  const byDate = await db.collection('attendances').find({ date: "2026-03-27" }).toArray();
  console.log(`Found ${byDate.length} records for 2026-03-27`);
  
  byDate.forEach(d => {
    console.log(`- Doc slNo: "${d.slNo}" (Type: ${typeof d.slNo}), _id: ${d._id}`);
  });
  
  process.exit(0);
}
check();
