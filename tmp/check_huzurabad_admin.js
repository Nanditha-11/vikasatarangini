const mongoose = require('mongoose');
require('dotenv').config({path: 'server/.env'});
const Admin = require('./server/src/models/Admin');

async function checkAdmins() {
  await mongoose.connect(process.env.MONGODB_URI);
  const admins = await Admin.find({ district: 'Karimnagar', place: 'Huzurabad' }).lean();
  console.log('Admins for Huzurabad:', JSON.stringify(admins, null, 2));
  process.exit(0);
}

checkAdmins().catch(err => {
  console.error(err);
  process.exit(1);
});
