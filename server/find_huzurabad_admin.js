const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Admin = mongoose.model('Admin', new mongoose.Schema({ username: String, district: String, place: String }));
  const admin = await Admin.findOne({ district: 'Karimnagar', place: 'Huzurabad' });
  if (admin) {
    console.log("Admin for Karimnagar/Huzurabad is:", admin.username);
  } else {
    console.log("No specific admin found for Karimnagar/Huzurabad in MAIN db.");
  }
  process.exit(0);
}
check();
