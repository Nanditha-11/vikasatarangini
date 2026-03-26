const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    district: { type: String, required: true, default: "Default District" },
    place: { type: String, required: true, default: "Default Place" },
    whatsappLink: { type: String, default: "" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    role: { type: String, enum: ["master", "admin"], default: "admin" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);
