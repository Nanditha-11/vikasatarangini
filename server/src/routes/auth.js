const express = require("express");
const nodemailer = require("nodemailer");
const { signAdminToken, requireAuth } = require("../lib/auth");
const Admin = require("../models/Admin");

const authRouter = express.Router();

// Memory store for OTPs (or use DB)
let activeOTP = null;
let otpExpiry = null;

authRouter.get("/districts", async (req, res) => {
  try {
    const districts = await Admin.distinct("district", { status: "approved" });
    // Sort alphabetically
    districts.sort();
    res.json(districts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

authRouter.get("/places/:district", async (req, res) => {
  try {
    const { district } = req.params;
    // Get unique approved places for this district
    const places = await Admin.distinct("place", { 
      district: { $regex: new RegExp(`^${district}$`, "i") },
      status: "approved"
    });
    places.sort();
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
      place: admin.place,
      whatsappLink: admin.whatsappLink
    }
  });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const admin = await Admin.findOne({ username: req.user.username }).lean();
    if (!admin) return res.status(404).json({ error: "Admin not found" });
    
    // Don't send password
    const { password, ...safeData } = admin;
    res.json(safeData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

authRouter.post("/forgot-password", async (req, res) => {
  const { email } = req.body || {};
  const admin = await Admin.findOne({ 
    $or: [
      { email: { $regex: new RegExp(`^${email}$`, "i") } },
      { username: { $regex: new RegExp(`^${email}$`, "i") } }
    ]
  });
  if (!admin) {
    return res.status(400).json({ error: "Invalid admin email or username" });
  }

  const code = Math.floor(1000 + Math.random() * 9000); // 4-digit OTP
  activeOTP = String(code);
  otpExpiry = Date.now() + 10 * 60 * 1000; // 10 mins

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER || "swarnamrutham3@gmail.com",
      pass: process.env.GMAIL_PASS || "cljt mwaq ktob dodw" 
    }
  });

  const mailOptions = {
    from: process.env.GMAIL_USER || "swarnamrutham3@gmail.com",
    to: email, 
    subject: "Admin Password Reset - OTP",
    text: `Your 4-digit OTP for resetting the password is: ${activeOTP}. It will expire in 10 minutes.`
  };

  console.log(`[AUTH] Sending mail FROM: ${process.env.GMAIL_USER || "swarnamrutham3@gmail.com"}`);

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

authRouter.post("/verify-otp", async (req, res) => {
  const { otp } = req.body || {};
  if (!otp || activeOTP !== String(otp) || Date.now() > otpExpiry) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }
  res.json({ ok: true });
});

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
    const query = { 
      $or: [
        { email: { $regex: new RegExp(`^${email}$`, "i") } },
        { username: { $regex: new RegExp(`^${email}$`, "i") } }
      ]
    };
    const result = await Admin.updateOne(query, { $set: { password: newPassword } });
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

    // Notify Master Admin via Email
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER || "swarnamrutham3@gmail.com",
          pass: process.env.GMAIL_PASS || "cljt mwaq ktob dodw" 
        }
      });

      const adminMailOptions = {
        from: process.env.GMAIL_USER || "swarnamrutham3@gmail.com",
        to: "smarnamrutham3@gmail.com",
        subject: "New Admin Registration - Action Required",
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #0d2866;">New Admin Registration</h2>
            <p>A new admin has registered and is pending approval:</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Username:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${username}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${email}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>District:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${district}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Place:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${place}</td></tr>
            </table>
            <div style="margin-top: 30px; text-align: center;">
              <a href="https://vikasatarangini.onrender.com/api/admins/approve-direct/${admin._id}?secret=swarnamrutham_direct_approve" 
                 style="display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                 APPROVE THIS ADMIN NOW
              </a>
            </div>
            <p style="margin-top: 20px; font-size: 13px; color: #666;">
              Clicking the button above will immediately approve the user. For more options, please log in to the Master Dashboard.
            </p>
          </div>
        `
      };

      await transporter.sendMail(adminMailOptions);
      console.log(`[AUTH] Registration notification sent to smarnamrutham3@gmail.com for ${username}`);
    } catch (mailErr) {
      console.error("Failed to send registration notification email:", mailErr);
      // Don't fail the registration if only the email fails
    }

    res.status(201).json({ message: "Registration successful. Please wait for Master Admin approval." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { authRouter };

