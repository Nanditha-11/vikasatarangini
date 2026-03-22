const express = require("express");
const nodemailer = require("nodemailer");
const { signAdminToken } = require("../lib/auth");
const Admin = require("../models/Admin");

const authRouter = express.Router();

// Memory store for OTPs (or use DB)
let activeOTP = null;
let otpExpiry = null;

authRouter.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });

  const admin = await Admin.findOne({ username }).lean();
  if (!admin || admin.password !== password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signAdminToken();
  return res.json({ token });
});

authRouter.post("/forgot-password", async (req, res) => {
  const { email } = req.body || {};
  if (!email || email !== "vikasatarangini4@gmail.com") {
    return res.status(400).json({ error: "Invalid admin email" });
  }

  const code = Math.floor(100000 + Math.random() * 900000);
  activeOTP = String(code);
  otpExpiry = Date.now() + 10 * 60 * 1000; // 10 mins

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "vikasatarangini4@gmail.com",
      pass: "oquy nwwj cfkk xtvn" 
    }
  });

  const mailOptions = {
    from: "vikasatarangini4@gmail.com",
    to: "vikasatarangini4@gmail.com", // send to admin email
    subject: "Admin Password Reset - OTP",
    text: `Your OTP for resetting the password is: ${activeOTP}. It will expire in 10 minutes.`
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
  const { otp, newPassword } = req.body || {};
  if (!otp || !newPassword) return res.status(400).json({ error: "Missing fields" });

  if (activeOTP !== String(otp) || Date.now() > otpExpiry) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  // update DB
  await Admin.updateOne({}, { $set: { password: newPassword } });
  
  // clear OTP
  activeOTP = null;
  otpExpiry = null;

  res.json({ ok: true });
});

module.exports = { authRouter };

