const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

/**
 * MIGRATION: Array-based Attendance -> Flat Document Attendance
 */
async function migrate() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error("MONGODB_URI not found");

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    const adminDb = mongoose.connection.useDb('vikasatarangini_auth');
    const Admin = adminDb.model('Admin', new mongoose.Schema({ username: String }));
    const admins = await Admin.find({});

    for (const admin of admins) {
      const username = admin.username;
      console.log(`Processing Migration for Tenant: ${username}`);
      
      const tenantDb = mongoose.connection.useDb(`vikasatarangini_${username}`);
      
      // Old Schema definition for reading
      const OldAttendance = tenantDb.model('OldAttendance', new mongoose.Schema({
        date: String,
        presentStudents: Array,
        message: String,
        openingStock: Number,
        district: String,
        place: String,
        createdBy: String
      }, { collection: 'attendances', strict: false }));

      const Student = tenantDb.model('Student', new mongoose.Schema({
        slNo: String, name: String, fatherName: String, phone: String, age: Number
      }));

      // 1. Fetch ALL existing attendance docs that STILL HAVE the structure of an array
      const oldDocs = await OldAttendance.find({ presentStudents: { $exists: true, $type: "array" } }).lean();
      console.log(`Found ${oldDocs.length} historic record-documents to flatten for ${username}.`);

      for (const oldDoc of oldDocs) {
        const date = oldDoc.date;
        const presentArray = oldDoc.presentStudents || [];
        
        if (presentArray.length === 0) {
           // If it's an empty record, we just delete or skip
           await OldAttendance.deleteOne({ _id: oldDoc._id });
           continue;
        }

        // 2. Fetch student details to denormalize
        const slNos = presentArray.map(p => p.slNo);
        const students = await Student.find({ slNo: { $in: slNos } }).lean();
        const studentMap = new Map(students.map(s => [s.slNo, s]));

        // 3. Create flat documents
        const flatDocs = presentArray.map(p => {
          const s = studentMap.get(p.slNo) || {};
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

        // 4. Atomic Replace: Delete old parent doc, insert new flat docs
        const session = await tenantDb.startSession();
        try {
          await session.withTransaction(async () => {
             // Delete the one large doc
             await OldAttendance.deleteOne({ _id: oldDoc._id }).session(session);
             // Insert individual records
             if (flatDocs.length > 0) {
                // Use the collection directly to bypass the new Model schema if needed, but since we updated Attendance.js
                // we'll just use the collection name record insertion
                await tenantDb.collection('attendances').insertMany(flatDocs, { session });
             }
          });
          console.log(`Migrated ${date} with ${flatDocs.length} students.`);
        } finally {
          await session.endSession();
        }
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
