const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    slNo: { type: String, required: true, index: true },
    name: { type: String, required: true },
    fatherName: { type: String, default: "" },
    age: { type: Number, default: null },
    phone: { type: String, required: true },
    district: { type: String, index: true },
    place: { type: String, index: true },
    isVisiting: { type: Boolean, default: false },
    originPlace: { type: String, default: "" },
    originDistrict: { type: String, default: "" },
    createdBy: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

studentSchema.index({ slNo: 1, createdBy: 1 }, { unique: true });

module.exports = mongoose.model("Student", studentSchema);

