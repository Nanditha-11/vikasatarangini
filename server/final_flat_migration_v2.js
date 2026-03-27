const mongoose = require('mongoose');
const dotenv = require('dotenv');

const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

/**
 * FIXED MIGRATION: Using correct Admin DB
 */
async function migrate() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error("MONGODB_URI not found");

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    // The Admin collection is in the DEFAULT database of the URI
    const Admin = mongoose.model('Admin', new mongoose.Schema({ username: String }));
    const admins = await Admin.find({});

    console.log(`Found ${admins.length} admins to process.`);

    for (const admin of admins) {
      const username = admin.username;
      const dbName = `vikasatarangini_${username.toLowerCase()}`;
      console.log(`Processing Tenant: ${username} -> ${dbName}`);
      
      const tenantDb = mongoose.connection.useDb(dbName);
      
      const Student = tenantDb.model('Student_Migration', new mongoose.Schema({
        slNo: String, name: String, fatherName: String, phone: String, age: Number
      }), 'students');

      const OldAttendanceModel = tenantDb.model('Attendance_Migration', new mongoose.Schema({}, { strict: false }), 'attendances');

      // 1. Fetch ALL existing attendance docs that STILL HAVE the structure of an array
      const oldDocs = await OldAttendanceModel.find({ presentStudents: { $exists: true, $type: "array" } }).lean();
      
      if (oldDocs.length === 0) {
        console.log(`- No array-based records found for ${dbName}.`);
        continue;
      }
      
      console.log(`- Found ${oldDocs.length} record-documents to flatten.`);

      for (const oldDoc of oldDocs) {
        const date = oldDoc.date;
        const presentArray = oldDoc.presentStudents || [];
        
        // 2. Fetch student details to denormalize
        const slNos = presentArray.map(p => p.slNo);
        const students = await Student.find({ slNo: { $in: slNos } }).lean();
        const studentMap = new Map(students.map(s => [s.slNo, s]));

        // 3. Create flat documents
        const flatDocs = presentArray.map(p => {
          const s = studentMap.get(p.slNo) || { name: p.name || "Unknown" };
          return {
            date,
            slNo: p.slNo,
            name: s.name || "Unknown",
            fatherName: s.fatherName || "",
            phone: s.phone || "",
            age: s.age || 0,
            paymentMethod: p.paymentMethod || "Cash",
            quantity: p.quantity || 1,
            remark: p.remark || "",
            district: oldDoc.district,
            place: oldDoc.place,
            createdBy: oldDoc.createdBy || username,
            message: oldDoc.message || "",
            openingStock: oldDoc.openingStock || 0
          };
        });

        // 4. Transform: Delete old parent doc, insert new flat docs
        // Re-using the same collection
        await OldAttendanceModel.deleteOne({ _id: oldDoc._id });
        if (flatDocs.length > 0) {
           await tenantDb.collection('attendances').insertMany(flatDocs);
        }
        console.log(`  Migrated ${date} with ${flatDocs.length} students.`);
      }
    }

    console.log("Migration completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
