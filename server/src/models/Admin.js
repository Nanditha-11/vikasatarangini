const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    district: { type: String, required: true, default: "Default District" },
    place: { type: String, required: true, default: "Default Place" },
    whatsappLink: { type: String, default: "" },
    welcomeMessage: { type: String, default: "జై శ్రీమన్నారాయణ! ఈ రోజు సెషన్‌కు హాజరైనందుకు ధన్యవాదాలు." },
    absentMessage: { type: String, default: "జై శ్రీమన్నారాయణ! ఈ రోజు మీరు స్వర్ణామృత ప్రాశనకు హాజరు కాలేదు. దయచేసి తదుపరి కార్యక్రమానికి హాజరుకాగలరు." },
    inviteTemplate: { type: String, default: "జై శ్రీమన్నారాయణ!\n\nవికాస తరంగిణికి స్వాగతం, {{name}}. దయచేసి ఈ క్రింది లింక్‌ను క్లిక్ చేయడం ద్వారా మా అధికారిక వాట్సాప్ గ్రూప్‌లో చేరండి:\n\n{{link}}" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    role: { type: String, enum: ["master", "admin"], default: "admin" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);
