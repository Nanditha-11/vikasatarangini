const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Admin = mongoose.model('Admin', new mongoose.Schema({ username: String }));
  const admins = await Admin.find({});
  console.log("Admins found:", admins.map(a => a.username));
  
  for (const admin of admins) {
    const dbName = `vikasatarangini_${admin.username.toLowerCase()}`;
    const tenantDb = mongoose.connection.useDb(dbName);
    const count = await tenantDb.collection('attendances').countDocuments({});
    console.log(`- ${admin.username} (${dbName}): ${count} records`);
    if (count > 0) {
       const samples = await tenantDb.collection('attendances').find({}).limit(1).toArray();
       console.log(`  Sample keys:`, Object.keys(samples[0]));
    }
  }
  process.exit(0);
}
check();
