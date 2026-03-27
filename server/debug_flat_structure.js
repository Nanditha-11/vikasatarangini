const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.useDb('vikasatarangini_vikasatarangini');
  const all = await db.collection('attendances').find({}).toArray();
  console.log("Total records:", all.length);
  
  const dates = [...new Set(all.map(a => a.date))];
  console.log("Dates found:", dates);
  
  dates.forEach(d => {
    const day = all.filter(a => a.date === d);
    console.log(`- Date ${d}: ${day.length} documents`);
    day.forEach((doc, idx) => {
       console.log(`  [Doc ${idx}] _id: ${doc._id}, slNo: ${doc.slNo}, name: ${doc.name}, presentStudentsArrFound: ${!!doc.presentStudents}`);
    });
  });
  process.exit(0);
}
check();
