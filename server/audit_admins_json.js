const mongoose = require("mongoose");
const fs = require("fs");
require("dotenv").config();

const adminSchema = new mongoose.Schema({
  username: String, district: String, place: String, role: String, status: String
});

async function audit() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Admin = mongoose.model("Admin", adminSchema);
  const admins = await Admin.find({}).lean();
  fs.writeFileSync("audit_results.json", JSON.stringify(admins, null, 2));
  process.exit(0);
}

audit().catch(err => { console.error(err); process.exit(1); });
