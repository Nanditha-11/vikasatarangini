const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    district: { type: String, required: true, default: "Default District" },
    place: { type: String, required: true, default: "Default Place" },
    whatsappLink: { type: String, default: "" },
    welcomeMessage: { type: String, default: "Jai Srimannarayana! Thank you for attending the session today." },
    inviteTemplate: { type: String, default: "Jai Srimannarayana!\n\nWelcome to Vikasatarangini, {{name}}. Please join our official WhatsApp group by clicking the link below:\n\n{{link}}" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    role: { type: String, enum: ["master", "admin"], default: "admin" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);
