const mongoose = require("mongoose");
const Admin = require("./src/models/Admin");
const dotenv = require("dotenv");
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const admins = await Admin.find({ role: "admin" }).sort({ createdAt: -1 }).limit(5);
  console.log("Recent Admins:");
  admins.forEach(a => {
    console.log(`- ${a.username}: ${a.status} (${a._id})`);
  });
  process.exit(0);
}
check();
