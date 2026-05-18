const express = require('express');
const { sendWhatsAppMessage, getStatus, logoutWhatsApp } = require('../lib/whatsappService');

const router = express.Router();

// GET /api/whatsapp/status
router.get('/status', (req, res) => {
  try {
    res.json(getStatus());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/send
router.post('/send', async (req, res) => {
  const { phone, text } = req.body;
  if (!phone || !text) {
    return res.status(400).json({ error: 'Phone and text are required' });
  }

  try {
    const result = await sendWhatsAppMessage(phone, text);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/logout
router.post('/logout', async (req, res) => {
  try {
    await logoutWhatsApp();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { whatsappRouter: router };
