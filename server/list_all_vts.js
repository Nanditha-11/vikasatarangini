const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const adminDoc = await mongoose.connection.db.admin().listDatabases();
  adminDoc.databases.forEach(db => {
    if (db.name.startsWith('vikasatarangini')) {
      console.log(`DB Name: ${db.name}`);
    }
  });
  process.exit(0);
}
check();
