const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

async function checkHistory() {
  const uri = process.env.MONGODB_URI;
  try {
    const client = await mongoose.connect(uri);
    const adminDb = client.connection.db.admin();
    const dbs = await adminDb.listDatabases();
    const tenantDbs = dbs.databases.filter(db => db.name.startsWith("vikasatarangini_"));

    for (const dbInfo of tenantDbs) {
      const dbName = dbInfo.name;
      console.log(`Database: ${dbName}`);
      const db = client.connection.useDb(dbName);
      const collection = db.db.collection("attendances");
      const dates = await collection.distinct("date");
      console.log(`  Unique Dates: ${dates.join(", ")}`);
      for (const date of dates) {
          const count = await collection.countDocuments({ date });
          console.log(`    Date ${date}: ${count} records`);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkHistory();
