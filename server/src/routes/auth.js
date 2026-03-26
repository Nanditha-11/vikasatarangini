const express = require("express");
const nodemailer = require("nodemailer");
const { signAdminToken } = require("../lib/auth");
const Admin = require("../models/Admin");

const authRouter = express.Router();

// Memory store for OTPs (or use DB)
let activeOTP = null;
let otpExpiry = null;

authRouter.get("/places/:district", async (req, res) => {
  try {
    const { district } = req.params;
    // Get unique approved places for this district
    const places = await Admin.distinct("place", { district });
    res.json(places);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

authRouter.post("/login", async (req, res) => {
  let { username, password, district, place } = req.body;
  username = username?.trim();
  password = password?.trim();
  if (!username || !password || !district || !place) return res.status(400).json({ error: "Missing fields" });

  const admin = await Admin.findOne({ 
    username: { $regex: new RegExp(`^${username}$`, "i") }, 
    district, 
    place 
  }).lean();
  if (!admin || admin.password !== password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Check if account is approved
  if (admin.status !== "approved") {
    return res.status(401).json({ error: "Account pending approval. Please contact the Master Admin." });
  }

  const token = signAdminToken(admin);
  
  // Ensure username is capitalized for display
  const displayUsername = admin.username.charAt(0).toUpperCase() + admin.username.slice(1);

  return res.json({ 
    token,
    user: {
      id: admin._id,
      username: displayUsername,
      role: admin.role,
      district: admin.district,
      place: admin.place
    }
  });
});

authRouter.post("/forgot-password", async (req, res) => {
  const { email } = req.body || {};
  const admin = await Admin.findOne({ email });
  if (!admin) {
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

function isPasswordComplex(password) {
  if (password.length < 8) return false;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  return hasLetter && hasNumber && hasSpecial;
}

authRouter.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body || {};
  if (!email || !otp || !newPassword) return res.status(400).json({ error: "Missing fields" });

  if (activeOTP !== String(otp) || Date.now() > otpExpiry) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  if (!isPasswordComplex(newPassword)) {
    return res.status(400).json({ error: "Password must be at least 8 characters and contain letters, numbers, and special characters." });
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

authRouter.post("/register", async (req, res) => {
  try {
    let { username, password, email, district, place, whatsappLink } = req.body;
    username = username?.trim();
    if (username) {
      username = username.charAt(0).toUpperCase() + username.slice(1);
    }
    if (place) {
      place = place.charAt(0).toUpperCase() + place.slice(1);
    }
    password = password?.trim();

    if (!isPasswordComplex(password)) {
      return res.status(400).json({ error: "Password must be at least 8 characters and contain letters, numbers, and special characters." });
    }
    
    // Check if username already exists
    const existing = await Admin.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, "i") } 
    });
    if (existing) {
      return res.status(400).json({ error: "Username already taken" });
    }

    const admin = new Admin({
      username,
      password,
      email,
      district,
      place,
      whatsappLink: whatsappLink || "",
      status: "pending",
      role: "admin"
    });

    await admin.save();
    res.status(201).json({ message: "Registration successful. Please wait for Master Admin approval." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { authRouter };

