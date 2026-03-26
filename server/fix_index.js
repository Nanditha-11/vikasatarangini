const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

async function fix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const collection = mongoose.connection.collection("students");
    
    // Drop the old global unique index on slNo
    try {
      await collection.dropIndex("slNo_1");
      console.log("Dropped slNo_1 index");
    } catch (e) {
      console.log("slNo_1 index not found or already dropped");
    }

    // Drop the new one if it already exists to be sure
    try {
      await collection.dropIndex("slNo_1_district_1_place_1");
    } catch (e) {}

    // Let Mongoose recreate them from the model definition
    console.log("Indexes will be recreated by Mongoose on next start/operation.");
    
    process.exit(0);
  } catch (err) {
    console.error("Fix failed:", err);
    process.exit(1);
  }
}

fix();
