const mongoose = require('mongoose');
const Admin = require('./src/models/Admin');
require('dotenv').config();

async function fix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await Admin.updateOne(
      { username: 'adminadmin' },
      { 
        $set: { 
          password: 'mainpassword',
          district: 'Main',
          place: 'Main',
          role: 'master',
          status: 'approved',
          email: 'vikasatarangini4@gmail.com'
        }
      },
      { upsert: true }
    );
    console.log('Master Admin setup successfully!');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
fix();
