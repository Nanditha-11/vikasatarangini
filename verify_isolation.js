const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'server/.env' });

const Admin = require('./server/src/models/Admin');

async function testIsolation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const adminA = await Admin.findOne({ username: 'AdminA' }) || new Admin({ username: 'AdminA', password: 'p1', email: 'a@a.com', district: 'D1', place: 'P1', status: 'approved' });
    const adminB = await Admin.findOne({ username: 'AdminB' }) || new Admin({ username: 'AdminB', password: 'p1', email: 'b@b.com', district: 'D1', place: 'P1', status: 'approved' });

    adminA.whatsappLink = 'link_A';
    adminB.whatsappLink = 'link_B';

    await adminA.save();
    await adminB.save();

    const checkA = await Admin.findOne({ username: 'AdminA' });
    const checkB = await Admin.findOne({ username: 'AdminB' });

    console.log('Admin A Link:', checkA.whatsappLink);
    console.log('Admin B Link:', checkB.whatsappLink);

    if (checkA.whatsappLink === 'link_A' && checkB.whatsappLink === 'link_B') {
      console.log('✅ PASS: Config is isolated even for same District/Place');
    } else {
      console.log('❌ FAIL: Config overlap detected');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testIsolation();
