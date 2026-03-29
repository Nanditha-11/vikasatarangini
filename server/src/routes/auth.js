const express = require("express");
const nodemailer = require("nodemailer");
const { signAdminToken, requireAuth } = require("../lib/auth");
const Admin = require("../models/Admin");

const authRouter = express.Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.GMAIL_USER || "swarnamrutham3@gmail.com",
    pass: process.env.GMAIL_PASS || "ykod qvle rvyq auih"
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 15000, // 15s
  greetingTimeout: 15000,
});

// Memory store for OTPs: email/identifier -> { otp, expiry }
const otpStore = new Map();

authRouter.post("/send-register-otp", async (req, res) => {
  let { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "Email is required" });
  email = email.toLowerCase().trim();

  const code = Math.floor(1000 + Math.random() * 9000); // 4-digit OTP
  console.log(`[AUTH] Registration OTP for ${email}: ${code}`);
  otpStore.set(email, {
    otp: String(code),
    expiry: Date.now() + 10 * 60 * 1000 // 10 mins
  });

  const mailOptions = {
    from: process.env.GMAIL_USER || "swarnamrutham3@gmail.com",
    to: email,
    subject: "Vikasa Tarangini - Registration OTP",
    text: `Your 4-digit OTP for registration is: ${code}. It will expire in 10 minutes.`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ ok: true, message: "OTP sent to your email" });
  } catch (err) {
    console.error("Mail error:", err);
    res.status(500).json({ error: "Failed to send email" });
  }
});

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
  let { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "Email or username is required" });
  email = email.toLowerCase().trim();

  const admin = await Admin.findOne({
    $or: [
      { email: { $regex: new RegExp(`^${email}$`, "i") } },
      { username: { $regex: new RegExp(`^${email}$`, "i") } }
    ]
  });
  if (!admin) {
    return res.status(400).json({ error: "Invalid admin email or username" });
  }
  // Use the actual email from the database for the OTP key
  const actualEmail = admin.email.toLowerCase();

  const code = Math.floor(1000 + Math.random() * 9000); // 4-digit OTP
  otpStore.set(actualEmail, {
    otp: String(code),
    expiry: Date.now() + 10 * 60 * 1000 // 10 mins
  });

  const mailOptions = {
    from: process.env.GMAIL_USER || "swarnamrutham3@gmail.com",
    to: actualEmail,
    subject: "Admin Password Reset - OTP",
    text: `Your 4-digit OTP for resetting the password is: ${code}. It will expire in 10 minutes.`
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
  let { email, otp } = req.body || {};
  if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });
  email = email.toLowerCase().trim();
  
  const record = otpStore.get(email);
  if (!record || record.otp !== String(otp) || Date.now() > record.expiry) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }
  res.json({ ok: true });
});

authRouter.post("/reset-password", async (req, res) => {
  let { email, otp, newPassword } = req.body || {};
  if (!email || !otp || !newPassword) return res.status(400).json({ error: "Missing fields" });
  email = email.toLowerCase().trim();

  const record = otpStore.get(email);
  if (!record || record.otp !== String(otp) || Date.now() > record.expiry) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      return res.status(400).json({ error: "Password must contain letters, numbers, and special symbols" });
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
    otpStore.delete(email);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

authRouter.post("/register", async (req, res) => {
  try {
    let { username, password, email, district, place, whatsappLink, otp } = req.body;
    email = email?.toLowerCase().trim();
    
    // Verify OTP one last time during final registration
    const record = otpStore.get(email);
    if (!record || record.otp !== String(otp) || Date.now() > record.expiry) {
      return res.status(400).json({ error: "Invalid or expired OTP. Please verify your email again." });
    }

    username = username?.trim();
    if (username) {
      username = username.charAt(0).toUpperCase() + username.slice(1);
    }
    if (place) {
      place = place.charAt(0).toUpperCase() + place.slice(1).toLowerCase();
    }
    password = password?.trim();

    if (!isPasswordComplex(password)) {
      return res.status(400).json({ error: "Password must be at least 8 characters and contain letters, numbers, and special characters." });
    }

    // Check if username already exists
    const existing = await Admin.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, "i") } 
    });

    let admin;
    if (existing) {
      if (existing.status === "approved") {
        return res.status(400).json({ error: "Username already taken" });
      }
      
      // If pending or rejected, update the existing record instead of creating a new one
      existing.password = password;
      existing.email = email;
      existing.district = district;
      existing.place = place;
      existing.whatsappLink = whatsappLink || "";
      existing.status = "pending"; // Reset to pending if it was rejected
      admin = existing;
    } else {
      admin = new Admin({
        username,
        password,
        email,
        district,
        place,
        whatsappLink: whatsappLink || "",
        status: "pending",
        role: "admin"
      });
    }

    await admin.save();

    // Clear OTP after successful registration
    otpStore.delete(email);

    // Notify Master Admin via Email
    try {


      const adminMailOptions = {
        from: process.env.GMAIL_USER || "swarnamrutham3@gmail.com",
        to: "swarnamrutham3@gmail.com",
        subject: "New Admin Registered",
        text: `A new admin has registered on the system.\n\n` +
          `Username: ${username}\n` +
          `Email: ${email}\n` +
          `District: ${district}\n` +
          `Place: ${place}\n\n` +
          `You can manage this request in your Master Dashboard.`
      };

      await transporter.sendMail(adminMailOptions);
      console.log(`[AUTH] Registration notification sent to smarnamrutham3@gmail.com for ${username}`);
    } catch (mailErr) {
      console.error("Failed to send registration notification email:", mailErr);
      // Don't fail the registration if only the email fails
    }

    res.status(201).json({ message: "Registration successful. Please wait for Master Admin approval. Contact swarnamrutham3@gmail.com for more details." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { authRouter };

