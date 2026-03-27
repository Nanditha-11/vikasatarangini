const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.useDb('vikasatarangini_nandini');
  const coll = db.collection('attendances');
  const all = await coll.find({}).toArray();
  console.log("Total records in vikasatarangini_nandini:", all.length);
  if (all.length > 0) {
    console.log("Sample keys in first doc:", Object.keys(all[0]));
    console.log("Sample doc:", JSON.stringify(all[0], null, 2));
  }
  process.exit(0);
}
check();
