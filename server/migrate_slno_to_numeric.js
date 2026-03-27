const mongoose = require('mongoose');
const URI_BASE = 'mongodb://yathipathisd:Pandu%400105@ac-bkbvymh-shard-00-00.mpdakyx.mongodb.net:27017,ac-bkbvymh-shard-00-01.mpdakyx.mongodb.net:27017,ac-bkbvymh-shard-00-02.mpdakyx.mongodb.net:27017/';
const URI_OPTS = '?ssl=true&replicaSet=atlas-9rvvxm-shard-0&authSource=admin&appName=Cluster0';

async function migrateDb(dbName) {
  console.log(`\n>>> Migrating DB: ${dbName}`);
  const conn = await mongoose.createConnection(URI_BASE + dbName + URI_OPTS);
  
  const Student = conn.model('Student', new mongoose.Schema({ slNo: mongoose.Schema.Types.Mixed }, { strict: false }), 'students');
  const Attendance = conn.model('Attendance', new mongoose.Schema({ slNo: mongoose.Schema.Types.Mixed }, { strict: false }), 'attendances');
  
  // 1. Students collection
  const students = await Student.find({}).lean();
  console.log(`   Found ${students.length} students.`);
  
  let studentCount = 0;
  for (const s of students) {
    if (typeof s.slNo === 'string') {
      const num = parseInt(s.slNo, 10);
      if (!isNaN(num)) {
        await Student.updateOne({ _id: s._id }, { $set: { slNo: num } });
        studentCount++;
      }
    }
  }
  console.log(`   Converted ${studentCount} students to numeric slNo.`);
  
  // 2. Attendances collection (for students)
  const attDocs = await Attendance.find({ slNo: { $exists: true } }).lean();
  console.log(`   Found ${attDocs.length} attendance student docs.`);
  
  let attCount = 0;
  for (const d of attDocs) {
    if (typeof d.slNo === 'string') {
      const num = parseInt(d.slNo, 10);
      if (!isNaN(num)) {
        await Attendance.updateOne({ _id: d._id }, { $set: { slNo: num } });
        attCount++;
      }
    }
  }
  console.log(`   Converted ${attCount} attendance docs to numeric slNo.`);
  
  await conn.close();
}

async function run() {
  const mainConn = await mongoose.connect(URI_BASE + 'vikasatarangini' + URI_OPTS);
  const admin = new mongoose.mongo.Admin(mainConn.connection.db);
  const dbData = await admin.listDatabases();
  const dbs = dbData.databases.map(d => d.name).filter(n => n.startsWith('vikasatarangini'));
  
  console.log('Discovered Target Databases:', dbs);
  
  for (const dbName of dbs) {
    await migrateDb(dbName);
  }
  
  console.log('\nMigration Complete!');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
