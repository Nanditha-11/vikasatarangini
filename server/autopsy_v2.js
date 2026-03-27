const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.useDb('vikasatarangini_vikasatarangini');
  const doc = await db.collection('attendances').findOne({});
  const out = JSON.stringify(doc, null, 2);
  fs.writeFileSync('autopsy_result.json', out);
  console.log("Written to autopsy_result.json");
  process.exit(0);
}
check();
