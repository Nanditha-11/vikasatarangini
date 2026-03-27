const mongoose = require('mongoose');
const URI_TENANT = 'mongodb://yathipathisd:Pandu%400105@ac-bkbvymh-shard-00-00.mpdakyx.mongodb.net:27017,ac-bkbvymh-shard-00-01.mpdakyx.mongodb.net:27017,ac-bkbvymh-shard-00-02.mpdakyx.mongodb.net:27017/vikasatarangini_vikasatarangini?ssl=true&replicaSet=atlas-9rvvxm-shard-0&authSource=admin&appName=Cluster0';

async function restore() {
  const conn = await mongoose.createConnection(URI_TENANT);
  const StudentSource = mongoose.model('StudentSource', new mongoose.Schema({ slNo: String, name: String, fatherName: String, age: String, phone: String, createdBy: String }, { strict: false }), 'students');
  const StudentDest = conn.model('StudentDest', new mongoose.Schema({ slNo: String, name: String, fatherName: String, age: String, phone: String, createdBy: String }, { strict: false }), 'students');
  
  const s106 = { slNo: '106', name: 'CH.Sahasra', fatherName: 'Srinivas', age: '12', phone: '9347309499', createdBy: 'vikasatarangini' };
  const s107 = { slNo: '107', name: 'CH.Sanjeevani', fatherName: 'Srinivas', age: '12', phone: '9347309499', createdBy: 'vikasatarangini' };
  
  await StudentDest.updateOne({ slNo: '106' }, { $set: s106 }, { upsert: true });
  await StudentDest.updateOne({ slNo: '107' }, { $set: s107 }, { upsert: true });
  
  console.log('Restored 106 and 107 to vikasatarangini_vikasatarangini');
  await conn.close();
  process.exit(0);
}

restore().catch(err => { console.error(err); process.exit(1); });
