const mongoose = require('mongoose');
const URI_BASE = 'mongodb://yathipathisd:Pandu%400105@ac-bkbvymh-shard-00-00.mpdakyx.mongodb.net:27017,ac-bkbvymh-shard-00-01.mpdakyx.mongodb.net:27017,ac-bkbvymh-shard-00-02.mpdakyx.mongodb.net:27017/';
const URI_OPTS = '?ssl=true&replicaSet=atlas-9rvvxm-shard-0&authSource=admin&appName=Cluster0';

async function reorderCollection(conn, dbName) {
  console.log(`\n--- Reordering DB: ${dbName} ---`);
  const StudentSource = conn.model('StudentSource', new mongoose.Schema({}, { strict: false }), 'students');
  
  const allStudents = await StudentSource.find({}).lean();
  if (allStudents.length === 0) {
    console.log('   No students found. Skipping.');
    return;
  }
  
  // Sort numerically
  allStudents.sort((a, b) => {
    const nA = parseInt(a.slNo, 10) || 0;
    const nB = parseInt(b.slNo, 10) || 0;
    return nA - nB;
  });
  
  console.log(`   Fetched and sorted ${allStudents.length} students.`);
  
  // Create temp collection
  const Temp = conn.model('TempStudent', new mongoose.Schema({}, { strict: false }), 'students_reordered');
  await Temp.deleteMany({});
  
  // Insert in order (without _id to get fresh consecutive ObjectIds if desired, or keep old ones?)
  // User seems to care about natural order, which follows ObjectId creation usually.
  // We'll strip old _id to ensure the new physical order in Mongo matches the sort.
  const toInsert = allStudents.map(s => {
    const { _id, ...rest } = s;
    return rest;
  });
  
  await Temp.insertMany(toInsert);
  console.log('   Inserted into temp collection in sorted order.');
  
  // Swap collections
  await conn.db.collection('students').rename('students_old_' + Date.now());
  await conn.db.collection('students_reordered').rename('students');
  
  console.log('   Collection swap complete.');
}

async function run() {
  const mainConn = await mongoose.connect(URI_BASE + 'vikasatarangini' + URI_OPTS);
  const admin = new mongoose.mongo.Admin(mainConn.connection.db);
  const dbData = await admin.listDatabases();
  const dbs = dbData.databases.map(d => d.name).filter(n => n.startsWith('vikasatarangini'));
  await mainConn.connection.close();
  
  for (const dbName of dbs) {
    const conn = await mongoose.createConnection(URI_BASE + dbName + URI_OPTS);
    await reorderCollection(conn, dbName);
    await conn.close();
  }
  
  console.log('\nAll databases reordered successfully!');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
