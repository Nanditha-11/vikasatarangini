const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

async function consolidate() {
  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri);

  const adminDb = mongoose.connection.db.admin();
  const dbs = await adminDb.listDatabases();
  const vDbs = dbs.databases.map(d => d.name).filter(n => n.startsWith("vikasatarangini_"));

  for (const dbName of vDbs) {
    console.log(`Processing ${dbName}...`);
    const db = mongoose.connection.useDb(dbName);
    const coll = db.db.collection("attendances");
    
    // 1. Fetch all docs (the flat ones)
    const docs = await coll.find({}).toArray();
    if (docs.length === 0) continue;

    // Filter out potential already-consolidated ones (they don't have slNo)
    const flatDocs = docs.filter(d => d.slNo);
    if (flatDocs.length === 0) continue;

    const consolidated = {}; // date_district_place -> record

    for (const d of flatDocs) {
      const key = `${d.date}_${d.district || ""}_${d.place || ""}`;
      if (!consolidated[key]) {
        consolidated[key] = {
          date: d.date,
          district: d.district,
          place: d.place,
          presentStudents: [],
          absentStudents: [],
          message: "",
          openingStock: 0
        };
      }
      
      const record = consolidated[key];
      if (d.slNo === "_SUMMARY") {
        record.message = d.message || "";
        record.openingStock = d.openingStock || 0;
      } else {
        record.presentStudents.push({
          slNo: d.slNo,
          name: d.name, // Keep name if available
          paymentMethod: d.paymentMethod || "Cash",
          quantity: d.quantity || 0,
          remark: d.remark || ""
        });
      }
    }

    // 2. Wipe the collection
    await coll.deleteMany({});
    
    // 3. Re-insert the consolidated records
    const finalDocs = Object.values(consolidated);
    if (finalDocs.length > 0) {
      await coll.insertMany(finalDocs);
      console.log(`  Converted ${flatDocs.length} flat records into ${finalDocs.length} array records for ${dbName}.`);
    }
  }

  await mongoose.disconnect();
  console.log("Migration back to array model complete.");
  process.exit(0);
}

consolidate().catch(console.error);
