const express = require("express");
const Admin = require("../models/Admin");
// In a real app, should use auth middleware to verify Master role
const adminManagementRouter = express.Router();

// Get all admins (should be protected for Master only)
adminManagementRouter.get("/all", async (req, res) => {
  console.log('GET /api/admins/all');
  try {
    const admins = await Admin.find({ role: "admin" }).sort({ createdAt: -1 });
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new admin
adminManagementRouter.post("/", async (req, res) => {
  try {
    const { username, password, email, district, place, status } = req.body;
    const admin = new Admin({ username, password, email, district, place, status: status || 'pending', role: 'admin' });
    await admin.save();
    res.status(201).json(admin);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const LocationConfig = require("../models/LocationConfig");

// Approve an admin
adminManagementRouter.post("/approve/:id", async (req, res) => {
  const idValue = req.params.id.trim();
  console.log(`[AdminMgmt] Attempting to APPROVE admin: "${idValue}"`);
  try {
    const admin = await Admin.findOneAndUpdate(
      { $or: [{ _id: idValue.length === 24 ? idValue : null }, { username: idValue }] },
      { status: "approved" },
      { new: true }
    );
    
    if (!admin) {
      console.error(`[AdminMgmt] Admin NOT FOUND for approval: "${idValue}"`);
      return res.status(404).json({ error: "Admin not found" });
    }

    console.log(`[AdminMgmt] Successfully APPROVED: ${admin.username} (ID: ${admin._id})`);
    res.json(admin);
  } catch (err) {
    console.error(`[AdminMgmt] Database ERROR during approval for "${idValue}":`, err);
    res.status(500).json({ error: err.message });
  }
});

// Reject an admin
adminManagementRouter.post("/reject/:id", async (req, res) => {
  const id = req.params.id.trim();
  console.log('[AdminMgmt] Attempting to reject:', id);
  try {
    // Support both ID and Username for flexibility
    const admin = await Admin.findOneAndUpdate(
      { $or: [{ _id: id.length === 24 ? id : null }, { username: id }] },
      { status: "rejected" },
      { new: true }
    );
    if (!admin) {
      console.log('[AdminMgmt] Admin NOT FOUND for reject:', id);
      return res.status(404).json({ error: "Admin not found" });
    }
    console.log('[AdminMgmt] Successfully rejected:', id);
    res.json(admin);
  } catch (err) {
    console.error('[AdminMgmt] ERROR in reject:', err);
    res.status(500).json({ error: err.message });
  }
});

// Set back to pending
adminManagementRouter.post("/pending/:id", async (req, res) => {
  const id = req.params.id.trim();
  console.log('[AdminMgmt] Attempting to set pending:', id);
  try {
    const admin = await Admin.findByIdAndUpdate(id, { status: "pending" }, { new: true });
    if (!admin) return res.status(404).json({ error: "Admin not found" });
    res.json(admin);
  } catch (err) {
    console.error('[AdminMgmt] ERROR in pending:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete an admin
adminManagementRouter.delete("/:id", async (req, res) => {
  const id = req.params.id.trim();
  const password = req.query.password;
  
  console.log('[AdminMgmt] Attempting to delete:', id);
  
  if (password !== 'swarnamrutham') {
    console.log('[AdminMgmt] DELETE FAILED: Incorrect password provided');
    return res.status(401).json({ error: "Incorrect master password" });
  }

  try {
    // Support both ID and Username for deletion
    const admin = await Admin.findOneAndDelete({
      $or: [{ _id: id.length === 24 ? id : null }, { username: id }]
    });
    if (!admin) {
      console.log('[AdminMgmt] Admin NOT FOUND for delete:', id);
      return res.status(404).json({ error: "Admin not found" });
    }
    console.log('[AdminMgmt] Successfully deleted:', id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[AdminMgmt] ERROR in delete:', err);
    res.status(500).json({ error: err.message });
  }
});

// Direct Approve via Email Link (GET request for simplicity)
adminManagementRouter.get("/approve-direct/:id", async (req, res) => {
  const idValue = req.params.id.trim();
  const { secret } = req.query;
  console.log(`[AdminMgmt] EMAIL LINK: Attempting to APPROVE admin: "${idValue}"`);

  if (secret !== 'swarnamrutham_direct_approve') {
    console.error(`[AdminMgmt] EMAIL LINK: FAILED - Invalid secret for "${idValue}"`);
    return res.status(401).send("<h1>Unauthorized</h1><p>Invalid approval link.</p>");
  }

  try {
    const admin = await Admin.findOneAndUpdate(
      { $or: [{ _id: idValue.length === 24 ? idValue : null }, { username: idValue }] },
      { status: "approved" },
      { new: true }
    );

    if (!admin) {
      console.error(`[AdminMgmt] EMAIL LINK: Admin NOT FOUND for approval: "${idValue}"`);
      return res.status(404).send("<h1>Error</h1><p>Admin not found.</p>");
    }

    console.log(`[AdminMgmt] EMAIL LINK: Successfully APPROVED: ${admin.username} (ID: ${admin._id})`);
    res.send(`
      <div style="font-family: sans-serif; text-align: center; padding: 80px 20px;">
        <div style="font-size: 50px; margin-bottom: 20px;">✅</div>
        <h1 style="color: #059669; margin: 0;">Access Authorized</h1>
        <p style="color: #475569; font-size: 1.1em; margin-top: 10px;">
          Admin <b>${admin.username}</b> has been approved and added to your <b>Authorized Administrators</b> list.
        </p>
        <p style="color: #94a3b8; font-size: 0.9em; margin-top: 30px;">
          You can close this tab now.
        </p>
      </div>
    `);
  } catch (err) {
    console.error(`[AdminMgmt] EMAIL LINK: Database ERROR during approval for "${idValue}":`, err);
    res.status(500).send(`<h1>Error</h1><p>${err.message}</p>`);
  }
});

module.exports = { adminManagementRouter };
