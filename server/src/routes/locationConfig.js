const express = require("express");
const { requireAuth } = require("../lib/auth");
const LocationConfig = require("../models/LocationConfig");
const Admin = require("../models/Admin");

const locationConfigRouter = express.Router();

locationConfigRouter.get("/", requireAuth, async (req, res) => {
  const { username, role } = req.user;
  let targetUsername = username;

  // Master admin can view config for a specific admin if username is provided
  if (role === "master" && req.query.username) {
    targetUsername = req.query.username;
  }

  try {
    const admin = await Admin.findOne({ 
      username: { $regex: new RegExp(`^${targetUsername}$`, "i") } 
    }).lean();

    if (!admin) return res.status(404).json({ error: "Admin not found" });

    res.json({
      district: admin.district,
      place: admin.place,
      whatsappLink: admin.whatsappLink || "",
      welcomeMessage: admin.welcomeMessage || "Jai Srimannarayana! Thank you for attending the session today.",
      inviteTemplate: admin.inviteTemplate || `Jai Srimannarayana!\n\nWelcome to Vikasatarangini, {{name}}. Please join our official WhatsApp group by clicking the link below:\n\n{{link}}`
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
