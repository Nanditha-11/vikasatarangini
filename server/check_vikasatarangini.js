const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.useDb('vikasatarangini_vikasatarangini');
  const count = await db.collection('attendances').countDocuments({});
  console.log(`- vikasatarangini_vikasatarangini: ${count} records`);
  if (count > 0) {
     const samples = await db.collection('attendances').find({}).limit(1).toArray();
     console.log(`  Sample doc:`, JSON.stringify(samples[0], null, 2));
  }
  process.exit(0);
}
check();
