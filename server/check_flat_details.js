const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.useDb('vikasatarangini_vikasatarangini');
  const samples = await db.collection('attendances').find({}).limit(5).toArray();
  console.log("Total flat documents:", await db.collection('attendances').countDocuments({}));
  samples.forEach(s => {
    console.log(`- slNo: ${s.slNo}, name: ${s.name}, date: ${s.date}, qty: ${s.quantity}`);
  });
  process.exit(0);
}
check();
