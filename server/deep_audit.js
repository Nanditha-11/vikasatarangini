const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const Student = require("./src/models/Student");

async function deepAudit() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const all = await Student.find({}, { slNo: 1, name: 1, district: 1, place: 1 }).lean();
    console.log(`Total Docs in DB: ${all.length}`);
    
    // Sort and print all just to see
    all.sort((a,b) => String(a.slNo).localeCompare(String(b.slNo), undefined, {numeric: true}));
    
    // Check if there are any that don't match our criteria
    const huzRows = all.filter(s => s.district === "Karimnagar" && s.place === "Huzurabad");
    console.log(`Huzurabad list length: ${huzRows.length}`);
    
    // Check for any students that are missing location or have different casing
    const oddRows = all.filter(s => s.district !== "Karimnagar" && s.district !== "Adilabad");
    console.log(`Odd rows: ${oddRows.length}`);
    if (oddRows.length > 0) {
      console.log(oddRows);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

deepAudit();
