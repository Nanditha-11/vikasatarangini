const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    type: { type: String, enum: ["student", "metadata"], required: true, index: true },
    
    // For student type:
    slNo: { type: Number, index: true },
    name: { type: String },
    fatherName: { type: String },
    phone: { type: String },
    age: { type: Number },
    paymentMethod: { type: String, enum: ["Cash", "Online", "Free", "Online Payment"], default: "Cash" },
    quantity: { type: Number, default: 0 },
    remark: { type: String, default: "" },

    // For metadata type:
    message: { type: String, default: "" },
    whatsappLink: { type: String, default: "" },
    openingStock: { type: Number, default: 0 },

    // Context
    district: { type: String, index: true },
    place: { type: String, index: true },
    createdBy: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

attendanceSchema.index({ date: 1, type: 1, slNo: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
