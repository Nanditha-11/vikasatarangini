const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const { connectDB } = require('./src/lib/db');
const { getTenantDb } = require('./src/lib/tenant');
const District = require('./src/models/District');

async function deleteStudent() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const districts = await District.find({});
  let found = false;

  for (const d of districts) {
    const tenantDb = await getTenantDb(d.district, d.place);
    const Student = tenantDb.model("Student", require('./src/models/Student').schema);
    
    const student = await Student.findOne({ slNo: 536 });
    if (student) {
      console.log(`Found student 536 in ${d.district} - ${d.place}. Deleting...`);
      await Student.deleteOne({ slNo: 536 });
      console.log(`Deleted student 536 from ${d.district} - ${d.place}`);
      found = true;
    }
  }

  if (!found) {
    console.log("Student 536 not found in any branch.");
  }
  
  process.exit(0);
}

deleteStudent();
