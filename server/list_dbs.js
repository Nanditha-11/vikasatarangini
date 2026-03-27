const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const adminDoc = await mongoose.connection.db.admin().listDatabases();
  console.log("Databases:", adminDoc.databases.map(d => d.name));
  
  for (const dbInfo of adminDoc.databases) {
    const dbName = dbInfo.name;
    if (dbName.startsWith('vikasatarangini')) {
      const db = mongoose.connection.useDb(dbName);
      const collections = await db.listCollections().toArray();
      const atts = collections.find(c => c.name === 'attendances');
      if (atts) {
        const count = await db.collection('attendances').countDocuments({});
        console.log(`- ${dbName}: ${count} attendances`);
        if (count > 0) {
          const sample = await db.collection('attendances').findOne({});
          console.log(`  Sample keys:`, Object.keys(sample));
          if (sample.presentStudents) {
             console.log(`  Structure: ARRAY`);
          } else {
             console.log(`  Structure: FLAT`);
          }
        }
      }
    }
  }
  process.exit(0);
}
check();
