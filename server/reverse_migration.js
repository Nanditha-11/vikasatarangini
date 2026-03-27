const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function inflate() {
  await mongoose.connect(process.env.MONGODB_URI);
  const adminDoc = await mongoose.connection.db.admin().listDatabases();
  
  for (const dbInfo of adminDoc.databases) {
    const dbName = dbInfo.name;
    if (!dbName.startsWith('vikasatarangini')) continue;
    
    console.log(`\nProcessing DB: ${dbName}`);
    const db = mongoose.connection.useDb(dbName);
    const col = db.collection('attendances');
    const studentCol = db.collection('students');
    
    const allStudents = await studentCol.find({}).toArray();
    const studentMap = new Map(allStudents.map(s => [s.slNo, s]));
    
    // Find all records that are NOT in the old array format
    // (In our case, everything that has a 'slNo' at the root level is a new flat record)
    const flatRecords = await col.find({ slNo: { $exists: true } }).toArray();
    
    if (flatRecords.length === 0) {
      console.log(`- No flat records found in ${dbName}. Skipping.`);
      continue;
    }
    
    // Group flat records by date
    const dateGroups = {};
    for (const rec of flatRecords) {
      if (!dateGroups[rec.date]) dateGroups[rec.date] = [];
      dateGroups[rec.date].push(rec);
    }
    
    for (const date in dateGroups) {
      const records = dateGroups[date];
      const sample = records[0];
      
      const presentStudents = records.map(r => ({
        slNo: r.slNo,
        paymentMethod: r.paymentMethod || "Cash",
        quantity: r.quantity || 0,
        remark: r.remark || ""
      }));
      
      const presentSlNos = new Set(presentStudents.map(p => p.slNo));
      const absentStudents = allStudents
        .filter(s => !presentSlNos.has(s.slNo))
        .map(s => ({ slNo: s.slNo, name: s.name }));
        
      const inflatedDoc = {
        date,
        presentStudents,
        absentStudents,
        message: sample.message || "",
        openingStock: sample.openingStock || 0,
        district: sample.district || "",
        place: sample.place || "",
        createdBy: sample.createdBy || "vikasatarangini",
        createdAt: sample.createdAt || new Date(),
        updatedAt: new Date()
      };
      
      // Update or Insert the group record
      // We use date+createdBy as uniqueness if available, or just date
      await col.deleteOne({ date }); // Clear existing flat/old for this date
      await col.insertOne(inflatedDoc);
      console.log(`- Inflated ${presentStudents.length} students into date ${date}`);
      
      // Delete the individual flat records that are now redundant
      await col.deleteMany({ date, slNo: { $exists: true } });
    }
  }
  
  console.log("\nInflation complete. All records restored to array format.");
  process.exit(0);
}
inflate();
