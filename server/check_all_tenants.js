const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const adminDb = mongoose.connection.useDb('vikasatarangini_auth');
  const Admin = adminDb.model('Admin', new mongoose.Schema({ username: String }));
  const admins = await Admin.find({});
  console.log("Admins:", admins.map(a => a.username));
  
  for (const admin of admins) {
    const tenantDb = mongoose.connection.useDb(`vikasatarangini_${admin.username}`);
    const count = await tenantDb.collection('attendances').countDocuments({});
    console.log(`- ${admin.username}: ${count} records`);
    if (count > 0) {
      const sample = await tenantDb.collection('attendances').findOne({});
      console.log(`  Sample doc keys:`, Object.keys(sample));
    }
  }
  process.exit(0);
}
check();
