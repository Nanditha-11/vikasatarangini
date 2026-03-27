const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.useDb('vikasatarangini_vikasatarangini');
  const all = await db.collection('attendances').find({ date: "2026-03-27" }).toArray();
  console.log(`Found ${all.length} records for 2026-03-27`);
  all.forEach((doc, i) => {
    console.log(`[${i}] ID: ${doc._id}, slNo: ${doc.slNo}, hasPresentArr: ${!!doc.presentStudents}`);
  });
  process.exit(0);
}
check();
