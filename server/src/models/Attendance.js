const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true, index: true }, // YYYY-MM-DD
    presentStudents: [
      {
        slNo: { type: String, required: true },
        paymentMethod: { type: String, enum: ["Cash", "Online", "Free"], default: "Cash" },
        quantity: { type: Number, default: 0 },
        remark: { type: String, default: "" },
      },
    ],
    absentStudents: [
      {
        slNo: { type: String, required: true },
        name: { type: String },
      },
    ],
    message: { type: String, default: "" },
    openingStock: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);

