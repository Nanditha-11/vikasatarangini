require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI");
  console.log('Connecting to Atlas...');
  await mongoose.connect(uri);
  console.log('Main DB Connected.');
  
  const dbs = await mongoose.connection.db.admin().listDatabases();
  console.log('Listing databases:');
  dbs.databases.forEach(d => {
    if (d.name.startsWith('vikasatarangini')) {
      console.log(`- ${d.name}`);
    }
  });
  
  // Try to connect to a tenant DB
  const tenant = 'vikasatarangini';
  const tenantDbName = `vikasatarangini_${tenant}`;
  console.log(`Connecting to tenant DB: ${tenantDbName}`);
  const conn = mongoose.createConnection(uri.replace(/\/[^?]+(\?|$)/, `/${tenantDbName}$1`));
  await conn.asPromise();
  console.log('Tenant DB Connected.');
  
  const students = await conn.db.collection('students').countDocuments();
  console.log(`Students in tenant DB: ${students}`);
  
  process.exit(0);
}

check().catch(err => {
  console.error('Check failed:', err);
  process.exit(1);
});
