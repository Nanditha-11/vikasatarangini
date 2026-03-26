const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const LocationConfig = require("./src/models/LocationConfig");

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    await LocationConfig.updateOne(
      { district: "Karimnagar", place: "Huzurabad" },
      { 
        $set: { 
          district: "Karimnagar", 
          place: "Huzurabad",
          whatsappLink: "https://chat.whatsapp.com/I4HtF79W6msI5RftyIPgpd",
          welcomeMessage: "Jai Srimannarayana! Thank you for attending the session today.",
          inviteTemplate: `Jai Srimannarayana!\n\nWelcome to Vikasatarangini, {{name}}. Please join our official WhatsApp group by clicking the link below:\n\n{{link}}`
        } 
      },
      { upsert: true }
    );
    console.log("Seeded Karimnagar / Huzurabad config");

    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

seed();
