const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const { connectDb, getTenantDb } = require('./src/lib/db');
const Admin = require('./src/models/Admin');

async function execute() {
  await connectDb();
  
  const admins = await Admin.find({ role: "admin" });

  for (const admin of admins) {
    const tenantDb = getTenantDb(admin.username);
    
    // Schema setup
    const Student = tenantDb.model("Student", require('./src/models/Student').schema);
    
    // Delete Student 536
    const student = await Student.findOne({ slNo: "536" });
    if (student) {
      await Student.deleteOne({ slNo: "536" });
      console.log(`  -> Deleted student 536: ${student.name}`);
    } else {
      console.log(`  -> Student 536 not found in ${admin.username}`);
    }
  }

  process.exit(0);
}

execute();
