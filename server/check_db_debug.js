const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'c:/Users/nandi/Documents/pls edit/final0/server/.env' });

async function check() {
  const uri = process.env.MONGODB_URI;
  const dbName = 'vikasatarangini_vikasatarangini';
  
  const connection = await mongoose.createConnection(uri.replace(/\/[^/?]+(\?|$)/, `/${dbName}$1`)).asPromise();
  
  console.log("Checking database:", dbName);
  
  const studentCount = await connection.collection('students').countDocuments({});
  console.log("Total students in DB:", studentCount);
  
  const attendances = await connection.collection('attendances').find({}).toArray();
  console.log("Total attendance records:", attendances.length);
  
  if (attendances.length > 0) {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = attendances.filter(a => a.date === today);
    console.log(`Records for today (${today}):`, todayRecords.length);
    
    if (todayRecords.length > 0) {
      const studentRecs = todayRecords.filter(r => r.type === 'student');
      const metadataRecs = todayRecords.filter(r => r.type === 'metadata');
      console.log("- Students present:", studentRecs.length);
      console.log("- Metadata records:", metadataRecs.length);
      if(studentRecs.length > 0) {
        console.log("Sample student record:", JSON.stringify(studentRecs[0], null, 2));
      }
    }
  }
  
  await connection.close();
  process.exit(0);
}

check().catch(console.error);
