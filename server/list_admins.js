require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Admin = require('./src/models/Admin');
  const admins = await Admin.find({}).lean();
  console.log('Admins list:');
  admins.forEach(a => {
    console.log(`User: ${a.username}, Status: ${a.status}, Role: ${a.role}, Pwd: ${a.password}`);
  });
  process.exit(0);
}

check().catch(console.error);
