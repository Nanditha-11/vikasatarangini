const mongoose = require("mongoose");

// Define Schemas once
const StudentSchema = new mongoose.Schema({
  slNo: { type: Number, required: true }, // Scoped slNo within tenant
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
  type: { type: String, enum: ["student", "metadata"], required: true },
  
  // Fields for Student type
  slNo: { type: Number },
  name: { type: String },
  fatherName: { type: String },
  phone: { type: String },
  paymentMethod: { type: String },
  quantity: { type: Number },
  remark: { type: String },

  // Fields for Metadata type
  message: String,
  whatsappLink: String,
  openingStock: { type: Number, default: 0 },
  
  district: String,
  place: String,
  createdAt: { type: Date, default: Date.now }
});

// We can't have a unique index on 'date' alone anymore as many student docs share a date
// Instead, use a composite index for finding specific records
AttendanceSchema.index({ date: 1, type: 1, slNo: 1 });

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
