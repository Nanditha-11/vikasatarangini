const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

// Define Admin schema manually to avoid complexities
const adminSchema = new mongoose.Schema({
  username: String,
  district: String,
  place: String,
  role: String,
  status: String
});

async function audit() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Admin = mongoose.model("Admin", adminSchema);
  
  const admins = await Admin.find({});
  console.log("AUDIT_START");
  admins.forEach(a => {
    console.log(`USER:${a.username}|DISTRICT:${a.district}|PLACE:${a.place}|ROLE:${a.role}|STATUS:${a.status}`);
  });
  console.log("AUDIT_END");
  
  process.exit(0);
}

audit().catch(err => { console.error(err); process.exit(1); });
