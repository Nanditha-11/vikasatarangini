const mongoose = require("mongoose");

// Define Schemas once
const StudentSchema = new mongoose.Schema({
  slNo: { type: String, required: true }, // Scoped slNo within tenant
  name: { type: String, required: true },
  fatherName: String,
  age: Number,
  phone: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Composite index for slNo within this tenant's collection
StudentSchema.index({ slNo: 1 }, { unique: true });

const AttendanceSchema = new mongoose.Schema({
  date: { type: String, required: true }, // Format YYYY-MM-DD
  message: String,
  openingStock: { type: Number, default: 0 },
  records: [{
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    present: { type: Boolean, default: false },
    soldCount: { type: Number, default: 0 },
    payment: { type: Number, default: 0 }
  }],
  createdAt: { type: Date, default: Date.now }
});
AttendanceSchema.index({ date: 1 }, { unique: true });

/**
 * Returns the models for a specific tenant connection.
 */
function getTenantModels(connection) {
  return {
    Student: connection.model("Student", StudentSchema),
    Attendance: connection.model("Attendance", AttendanceSchema)
  };
}

module.exports = { getTenantModels };
