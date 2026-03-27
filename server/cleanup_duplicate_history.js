const mongoose = require('mongoose');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const adminDb = mongoose.connection.useDb('vikasatarangini_auth');
    const Admin = adminDb.model('Admin', new mongoose.Schema({ username: String }));
    const admins = await Admin.find({});

    for (const admin of admins) {
      const username = admin.username;
      console.log(`Checking tenant: ${username}`);
      const tenantDb = mongoose.connection.useDb(`vikasatarangini_${username}`);
      
      const AttendanceSchema = new mongoose.Schema({
        date: String,
        presentStudents: Array,
        absentStudents: Array
      });
      const Attendance = tenantDb.model('Attendance', AttendanceSchema);

      const allAttendance = await Attendance.find({}).sort({ date: -1 }).lean();
      const seenDates = new Set();
      const toDelete = [];

      for (const att of allAttendance) {
        if (seenDates.has(att.date)) {
          console.log(`[DUPE] Found duplicate for ${att.date} in ${username}. ID: ${att._id}`);
          toDelete.push(att._id);
        } else {
          seenDates.add(att.date);
        }
      }

      if (toDelete.length > 0) {
        console.log(`Deleting ${toDelete.length} duplicates for ${username}...`);
        await Attendance.deleteMany({ _id: { $in: toDelete } });
      }

      // Also find documents with zero present students and potentially delete them if requested
      const withNoPresent = await Attendance.find({ 
        $or: [
          { presentStudents: { $size: 0 } },
          { presentStudents: { $exists: false } }
        ]
      });

      if (withNoPresent.length > 0) {
        console.log(`Found ${withNoPresent.length} documents with NO present students in ${username}. Deleting...`);
        await Attendance.deleteMany({ _id: { $in: withNoPresent.map(d => d._id) } });
      }
    }

    console.log("Cleanup finished.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

cleanup();
