const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.useDb('vikasatarangini_vikasatarangini');
  const doc = await db.collection('attendances').findOne({});
  console.log("FULL JSON:", JSON.stringify(doc, null, 2));
  process.exit(0);
}
check();
