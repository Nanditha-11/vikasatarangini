const mongoose = require("mongoose");
const Admin = require("./src/models/Admin");
const dotenv = require("dotenv");
dotenv.config();

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const idValue = "Nanduu"; // Testing with username
  console.log(`Testing approve for: ${idValue}`);
  
  const admin = await Admin.findOneAndUpdate(
    { $or: [{ _id: idValue.length === 24 ? idValue : null }, { username: idValue }] },
    { status: "approved" },
    { new: true }
  );

  if (admin) {
    console.log(`SUCCESS: ${admin.username} is now ${admin.status}`);
  } else {
    console.log("FAILED: Admin not found");
  }
  process.exit(0);
}
test();
