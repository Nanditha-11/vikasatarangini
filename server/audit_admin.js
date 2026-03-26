const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Admin = require("./src/models/Admin");

dotenv.config();

const audit = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await Admin.findOne({ username: "Admin" });
    if (!user) {
      console.log("AUDIT_RESULT: NOT_FOUND");
    } else {
      const issues = [];
      if (user.password !== "swarnamrutham") issues.push(`PASS_MISMATCH("${user.password}")`);
      if (user.district !== "Main") issues.push(`DISTRICT_MISMATCH("${user.district}")`);
      if (user.place !== "Main") issues.push(`PLACE_MISMATCH("${user.place}")`);
      if (user.status !== "approved") issues.push(`STATUS_MISMATCH("${user.status}")`);
      
      if (issues.length === 0) console.log("AUDIT_RESULT: PERFECT");
      else console.log("AUDIT_RESULT: ISSUES: " + issues.join(", "));
      
      console.log(`FULL_USER: ${JSON.stringify(user)}`);
    }
    
    // Check for "vikasatarangini" too
    const vika = await Admin.findOne({ username: "vikasatarangini" });
    if (vika) {
        console.log(`VIKA_USER: ${JSON.stringify({ 
            user: vika.username, 
            pass: vika.password, 
            dist: vika.district, 
            place: vika.place, 
            status: vika.status 
        })}`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
};

audit();
