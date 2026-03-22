const mongoose = require("mongoose");
const dotenv = require("dotenv");
const fs = require("fs");

dotenv.config();

async function migrateAndExport() {
  const localUri = "mongodb://localhost:27017/vikasatarangini";
  const atlasUri = process.env.MONGODB_URI;

  console.log("1. Connecting to Local DB...");
  const localConn = await mongoose.createConnection(localUri).asPromise();
  const LocalStudent = localConn.model("Student", new mongoose.Schema({ slNo: String, name: String }, { strict: false }), "students");
  
  console.log("2. Fetching all 493 students from local...");
  const localStudents = await LocalStudent.find({}).sort({ slNo: 1 }).lean();
  console.log(`Found ${localStudents.length} students locally.`);

  console.log("3. Connecting to Atlas DB...");
  const atlasConn = await mongoose.createConnection(atlasUri).asPromise();
  const AtlasStudent = atlasConn.model("Student", new mongoose.Schema({ slNo: String, name: String }, { strict: false }), "students");

  console.log("4. Clearing Atlas students collection...");
  await AtlasStudent.deleteMany({});

  console.log("5. Migrating students to Atlas...");
  // Strip _id to let Atlas generate new ones
  const toInsert = localStudents.map(s => {
    const { _id, ...rest } = s;
    return rest;
  });
  
  await AtlasStudent.insertMany(toInsert);
  console.log(`Successfully migrated ${toInsert.length} students to Atlas.`);

  console.log("6. Generating CSV for user...");
  let csvContent = "SlNo,Name,Father Name,Age,Phone\n";
  localStudents.forEach(s => {
    csvContent += `${s.slNo},"${s.name}","${s.fatherName || ""}","${s.age || ""}","${s.phone || ""}"\n`;
  });
  
  fs.writeFileSync("original_students_493.csv", csvContent);
  console.log("7. Created original_students_493.csv.");

  await localConn.close();
  await atlasConn.close();
  console.log("Done!");
}

migrateAndExport().catch(err => {
  console.error(err);
  process.exit(1);
});
