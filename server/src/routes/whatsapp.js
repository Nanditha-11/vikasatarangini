const express = require('express');
const { requireAuth } = require('../lib/auth');
const { tenantMiddleware } = require('../lib/tenantMiddleware');
const { sendWhatsAppMessage, getStatus, logoutWhatsApp, getDiagnose } = require('../lib/whatsappService');

const router = express.Router();

// Apply auth and tenant middlewares so req.user is guaranteed to be available
router.use(requireAuth, tenantMiddleware);

// GET /api/whatsapp/status
router.get('/status', (req, res) => {
  try {
    const tenantId = req.user.username;
    res.json(getStatus(tenantId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/whatsapp/diagnose
router.get('/diagnose', (req, res) => {
  try {
    const tenantId = req.user.username;
    res.json(getDiagnose(tenantId));
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
    const tenantId = req.user.username;
    const result = await sendWhatsAppMessage(tenantId, phone, text);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/broadcast
router.post('/broadcast', async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required' });
  }
  try {
    const tenantId = req.user.username;
    const results = await Promise.all(messages.map(msg => {
      const { phone, text } = msg;
      if (!phone || !text) {
        return Promise.resolve({ phone, error: 'Missing phone or text' });
      }
      return sendWhatsAppMessage(tenantId, phone, text)
        .then(r => ({ phone, result: r }))
        .catch(err => ({ phone, error: err.message }));
    }));
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/logout
router.post('/logout', async (req, res) => {
  try {
    const tenantId = req.user.username;
    await logoutWhatsApp(tenantId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { whatsappRouter: router };
