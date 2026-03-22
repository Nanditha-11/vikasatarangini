const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    slNo: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    fatherName: { type: String, default: "" },
    age: { type: Number, default: null },
    phone: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);

