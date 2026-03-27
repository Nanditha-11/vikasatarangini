const mongoose = require('mongoose');
const URI_BASE = 'mongodb://yathipathisd:Pandu%400105@ac-bkbvymh-shard-00-00.mpdakyx.mongodb.net:27017,ac-bkbvymh-shard-00-01.mpdakyx.mongodb.net:27017,ac-bkbvymh-shard-00-02.mpdakyx.mongodb.net:27017/';
const URI_OPTS = '?ssl=true&replicaSet=atlas-9rvvxm-shard-0&authSource=admin&appName=Cluster0';

async function check(dbName) {
  const conn = mongoose.createConnection(URI_BASE + dbName + URI_OPTS);
  const S = conn.model('S', new mongoose.Schema({ slNo: String, name: String }, { strict: false }), 'students');
  const s106 = await S.findOne({ slNo: '106' });
  const s107 = await S.findOne({ slNo: '107' });
  console.log(`DB ${dbName} 106:`, s106?.name || 'MISSING');
  console.log(`DB ${dbName} 107:`, s107?.name || 'MISSING');
  await conn.close();
}

async function run() {
  await check('vikasatarangini');
  await check('vikasatarangini_admin');
  await check('vikasatarangini_vikasatarangini');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
