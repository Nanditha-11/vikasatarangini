const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' }
});

const Admin = mongoose.model('Admin', adminSchema);

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const master = await Admin.findOne({ role: 'master' });
    console.log('Master Admin found:', master ? { username: master.username, password: master.password } : 'NONE');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
