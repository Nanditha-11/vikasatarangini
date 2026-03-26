const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
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
    district: { type: String, index: true },
    place: { type: String, index: true },
  },
  { timestamps: true }
);

attendanceSchema.index({ date: 1, district: 1, place: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
