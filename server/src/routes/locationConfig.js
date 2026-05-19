const express = require("express");
const { requireAuth } = require("../lib/auth");
const LocationConfig = require("../models/LocationConfig");
const Admin = require("../models/Admin");

const locationConfigRouter = express.Router();

locationConfigRouter.get("/", requireAuth, async (req, res) => {
  const { username, role } = req.user;
  let targetUsername = username;
  try {
    let query = { username: { $regex: new RegExp(`^${targetUsername}$`, "i") } };

    if (role === "master") {
      if (req.query.username) {
        query = { username: { $regex: new RegExp(`^${req.query.username}$`, "i") } };
      } else if (req.query.district && req.query.place) {
        query = { district: req.query.district, place: req.query.place, status: "approved" };
      }
    }

    const admin = await Admin.findOne(query).lean();

    if (!admin) return res.status(404).json({ error: "Admin not found" });

    res.json({
      district: admin.district,
      place: admin.place,
      whatsappLink: admin.whatsappLink || "",
      welcomeMessage: admin.welcomeMessage || "జై శ్రీమన్నారాయణ! ఈ రోజు సెషన్‌కు హాజరైనందుకు ధన్యవాదాలు.",
      inviteTemplate: admin.inviteTemplate || `జై శ్రీమన్నారాయణ!\n\nవికాస తరంగిణికి స్వాగతం, {{name}}. దయచేసి ఈ క్రింది లింక్‌ను క్లిక్ చేయడం ద్వారా మా అధికారిక వాట్సాప్ గ్రూప్‌లో చేరండి:\n\n{{link}}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

locationConfigRouter.post("/", requireAuth, async (req, res) => {
  const { username, role } = req.user;
  const { whatsappLink, welcomeMessage, inviteTemplate, username: providedUsername } = req.body;
  
  let targetUsername = username;

  // Master admin can update config for a specific admin
  if (role === "master" && providedUsername) {
    targetUsername = providedUsername;
  }

  try {
    const updated = await Admin.findOneAndUpdate(
      { username: { $regex: new RegExp(`^${targetUsername}$`, "i") } },
      { 
        $set: { 
          whatsappLink, 
          welcomeMessage, 
          inviteTemplate 
        } 
      },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ error: "Admin not found" });

    res.json({
      district: updated.district,
      place: updated.place,
      whatsappLink: updated.whatsappLink,
      welcomeMessage: updated.welcomeMessage,
      inviteTemplate: updated.inviteTemplate
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { locationConfigRouter };
