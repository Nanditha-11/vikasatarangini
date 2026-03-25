const express = require("express");
const nodemailer = require("nodemailer");
const { signAdminToken } = require("../lib/auth");
const Admin = require("../models/Admin");

const authRouter = express.Router();

// Memory store for OTPs (or use DB)
let activeOTP = null;
let otpExpiry = null;

authRouter.post("/login", async (req, res) => {
  const { username, password, district, place } = req.body || {};
  if (!username || !password || !district || !place) return res.status(400).json({ error: "Missing fields" });

  const admin = await Admin.findOne({ username, district, place }).lean();
  if (!admin || admin.password !== password) {
    return res.status(401).json({ error: "Invalid credentials for this location" });
  }

  const token = signAdminToken();
  return res.json({ token });
});

authRouter.post("/forgot-password", async (req, res) => {
  const { email } = req.body || {};
  if (!email || email !== "vikasatarangini4@gmail.com") {
    return res.status(400).json({ error: "Invalid admin email" });
  }

  const code = Math.floor(1000 + Math.random() * 9000); // 4-digit OTP
  activeOTP = String(code);
  otpExpiry = Date.now() + 10 * 60 * 1000; // 10 mins

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER || "vikasatarangini4@gmail.com",
      pass: process.env.GMAIL_PASS || "cljt mwaq ktob dodw" 
    }
  });

  const mailOptions = {
    from: process.env.GMAIL_USER || "vikasatarangini4@gmail.com",
    to: email, 
    subject: "Admin Password Reset - OTP",
    text: `Your 4-digit OTP for resetting the password is: ${activeOTP}. It will expire in 10 minutes.`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ ok: true, message: "OTP sent to your email" });
  } catch (err) {
    console.error("Mail error:", err);
    res.status(500).json({ error: "Failed to send email" });
  }
});

authRouter.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body || {};
  if (!email || !otp || !newPassword) return res.status(400).json({ error: "Missing fields" });

  if (activeOTP !== String(otp) || Date.now() > otpExpiry) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  // update DB
  try {
    const result = await Admin.updateOne({ email }, { $set: { password: newPassword } });
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Admin account not found" });
    }
    
    // clear OTP
    activeOTP = null;
    otpExpiry = null;

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

module.exports = { authRouter };

