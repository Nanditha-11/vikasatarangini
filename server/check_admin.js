require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Admin = require('./src/models/Admin');
  const counts = await Admin.countDocuments({});
  console.log(`Total admins: ${counts}`);
  const ad = await Admin.findOne({ username: 'Admin' }).lean();
  console.log(`Admin user: ${ad ? 'Found' : 'Not Found'}`);
  if (ad) console.log(`Admin status: ${ad.status}, Role: ${ad.role}`);
  process.exit(0);
}

check().catch(console.error);
