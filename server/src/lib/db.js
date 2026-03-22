const mongoose = require("mongoose");

async function connectDb() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/vikasatarangini";
  // If still not set, throw error (unlikely)
  if (!uri) {
    throw new Error("Missing MONGODB_URI env var");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
}

module.exports = { connectDb };

