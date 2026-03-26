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
  const id = req.params.id.trim();
  console.log('[AdminMgmt] Attempting to approve:', id);
  try {
    const admin = await Admin.findByIdAndUpdate(id, { status: "approved" }, { new: true });
    if (!admin) {
      console.log('[AdminMgmt] Admin NOT FOUND for approve:', id);
      return res.status(404).json({ error: "Admin not found" });
    }

    console.log('[AdminMgmt] Successfully approved:', id);
    res.json(admin);
  } catch (err) {
    console.error('[AdminMgmt] ERROR in approve:', err);
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

module.exports = { adminManagementRouter };
