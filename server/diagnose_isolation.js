const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Student = require("./src/models/Student");
const Admin = require("./src/models/Admin");

async function diagnose() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to DB");

  const students = await Student.find({}).lean();
  const admins = await Admin.find({}).lean();

  console.log("\n--- ADMINS ---");
  admins.forEach(a => {
    console.log(`Username: ${a.username} | Place: ${a.place} | Role: ${a.role}`);
  });

  console.log("\n--- STUDENT COUNTS PER USERNAME ---");
  const countPerUser = {};
  students.forEach(s => {
    countPerUser[s.createdBy] = (countPerUser[s.createdBy] || 0) + 1;
  });
  console.log(countPerUser);

  console.log("\n--- CHECKING FOR SAME SLNO IN SAME PLACE ACROSS USERNAMES ---");
  const placeSlNoMap = {}; // { place: { slNo: [usernames] } }
  students.forEach(s => {
    if (!placeSlNoMap[s.place]) placeSlNoMap[s.place] = {};
    if (!placeSlNoMap[s.place][s.slNo]) placeSlNoMap[s.place][s.slNo] = new Set();
    placeSlNoMap[s.place][s.slNo].add(s.createdBy);
  });

  Object.entries(placeSlNoMap).forEach(([place, slNos]) => {
    Object.entries(slNos).forEach(([slNo, users]) => {
      if (users.size > 1) {
        console.log(`Conflict! Place: ${place} | slNo: ${slNo} | Usernames: ${Array.from(users).join(", ")}`);
      }
    });
  });

  process.exit(0);
}
diagnose();
