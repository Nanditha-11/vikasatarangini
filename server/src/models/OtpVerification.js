const mongoose = require('mongoose');

const otpVerificationSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true
  },
  tenantId: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300 // Auto-delete document after 5 minutes (300 seconds)
  }
});

module.exports = mongoose.model('OtpVerification', otpVerificationSchema);
