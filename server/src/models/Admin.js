const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, default: "admin", unique: true },
    password: { type: String, required: true, default: "admin123" },
    email: { type: String, required: true, default: "vikasatarangini4@gmail.com" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);
