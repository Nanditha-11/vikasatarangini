const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const adminSchema = new mongoose.Schema({
  username: String,
  district: String,
  place: String,
  status: String
});

// Avoid re-compiling if it already exists
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

async function run() {
  try {
    console.log('Connecting to:', process.env.MONGODB_URI?.substring(0, 30) + '...');
    await mongoose.connect(process.env.MONGODB_URI);
    const admins = await Admin.find({}).lean();
    console.log('--- ADMIN AUDIT START ---');
    console.log(`Total admins found: ${admins.length}`);
    admins.forEach(a => {
      console.log(`User: ${a.username} | District: ${a.district} | Place: ${a.place} | Status: ${a.status}`);
    });
    console.log('--- ADMIN AUDIT END ---');
    process.exit(0);
  } catch (err) {
    console.error('AUDIT FAILED:', err);
    process.exit(1);
  }
}
run();
