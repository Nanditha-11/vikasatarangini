const mongoose = require('mongoose');
const URI_TENANT = 'mongodb://yathipathisd:Pandu%400105@ac-bkbvymh-shard-00-00.mpdakyx.mongodb.net:27017,ac-bkbvymh-shard-00-01.mpdakyx.mongodb.net:27017,ac-bkbvymh-shard-00-02.mpdakyx.mongodb.net:27017/vikasatarangini_vikasatarangini?ssl=true&replicaSet=atlas-9rvvxm-shard-0&authSource=admin&appName=Cluster0';

async function check() {
  const conn = await mongoose.createConnection(URI_TENANT);
  const S = conn.model('S', new mongoose.Schema({ slNo: mongoose.Schema.Types.Mixed }, { strict: false }), 'students');
  const all = await S.find({}, { slNo: 1 }).lean();
  
  const types = {};
  for (const s of all) {
    const t = typeof s.slNo;
    types[t] = (types[t] || 0) + 1;
    if (t === 'string') {
        console.log(`String ID found: ${s.slNo}`);
    }
  }
  console.log('Type breakdown:', types);
  await conn.close();
  process.exit(0);
}

check().catch(err => { console.error(err); process.exit(1); });
