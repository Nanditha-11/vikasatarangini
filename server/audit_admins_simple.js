const mongoose = require("mongoose");
const Admin = require("./src/models/Admin");
require("dotenv").config();

async function audit() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");
  
  const admins = await Admin.find({});
  console.log("Total Admins:", admins.length);
  
  admins.forEach(a => {
    console.log(`- User: ${a.username}, District: "${a.district}", Place: "${a.place}", Role: ${a.role}, Status: ${a.status}`);
  });
  
  process.exit(0);
}

audit().catch(err => { console.error(err); process.exit(1); });
