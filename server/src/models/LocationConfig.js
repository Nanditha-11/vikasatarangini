const mongoose = require("mongoose");

const locationConfigSchema = new mongoose.Schema(
  {
    district: { type: String, required: true },
    place: { type: String, required: true },
    whatsappLink: { type: String, default: "" },
    welcomeMessage: { type: String, default: "" },
    inviteTemplate: { type: String, default: "" },
  },
  { timestamps: true }
);

locationConfigSchema.index({ district: 1, place: 1 }, { unique: true });

module.exports = mongoose.model("LocationConfig", locationConfigSchema);
