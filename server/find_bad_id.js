const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const adminDoc = await mongoose.connection.db.admin().listDatabases();
  
  for (const dbInfo of adminDoc.databases) {
    const dbName = dbInfo.name;
    if (dbName.startsWith('vikasatarangini')) {
      const db = mongoose.connection.useDb(dbName);
      const doc = await db.collection('attendances').findOne({ _id: new mongoose.Types.ObjectId('69c60fcfa1baf589b9e2a4ab') });
      if (doc) {
        console.log(`FOUND ID 69c60fcfa1baf589b9e2a4ab in DB: ${dbName}`);
        console.log(`- hasPresentArr: ${!!doc.presentStudents}`);
      }
    }
  }
  process.exit(0);
}
check();
