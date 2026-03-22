const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const Student = require('../server/src/models/Student');

async function resetCreatedAt() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/vikasatarangini";
  console.log('Connecting to:', uri);
  
  try {
    await mongoose.connect(uri);
    console.log('Connected to DB.');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const result = await Student.updateMany({}, { $set: { createdAt: yesterday } });
    console.log(`Updated ${result.modifiedCount} students with createdAt = ${yesterday}`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

resetCreatedAt();
