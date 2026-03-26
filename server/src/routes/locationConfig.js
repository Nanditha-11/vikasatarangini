const express = require("express");
const { requireAuth } = require("../lib/auth");
const LocationConfig = require("../models/LocationConfig");

const locationConfigRouter = express.Router();

locationConfigRouter.get("/", requireAuth, async (req, res) => {
  const { district, place } = req.user;
  if (!district || !place) return res.status(400).json({ error: "Location not set" });

  let config = await LocationConfig.findOne({ district, place }).lean();
  if (!config) {
    // Default config if none exists
    config = {
      district,
      place,
      whatsappLink: district === "Karimnagar" ? "https://chat.whatsapp.com/I4HtF79W6msI5RftyIPgpd" : "",
      welcomeMessage: "Jai Srimannarayana! Thank you for attending the session today.",
      inviteTemplate: `Jai Srimannarayana!\n\nWelcome to Vikasatarangini, {{name}}. Please join our official WhatsApp group by clicking the link below:\n\n{{link}}`
    };
  }
  res.json(config);
});

locationConfigRouter.post("/", requireAuth, async (req, res) => {
  const { district, place } = req.user;
  const { whatsappLink, welcomeMessage, inviteTemplate } = req.body;

  const config = await LocationConfig.findOneAndUpdate(
    { district, place },
    { 
      $set: { 
        district, 
        place, 
        whatsappLink, 
        welcomeMessage, 
        inviteTemplate 
      } 
    },
    { upsert: true, new: true }
  ).lean();

  res.json(config);
});

module.exports = { locationConfigRouter };
