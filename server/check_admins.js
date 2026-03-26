const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Admin = require("./src/models/Admin");

dotenv.config();

const checkAdmins = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const admins = await Admin.find({}).lean();
    console.log("TOTAL_ADMINS: " + admins.length);
    admins.forEach(a => {
      console.log(`JSON_ADMIN: ${JSON.stringify(a)}`);
    });
    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
};

checkAdmins();
