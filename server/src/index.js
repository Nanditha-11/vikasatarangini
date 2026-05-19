const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const os = require("os");
const path = require("path");

const { connectDb } = require("./lib/db");
const { authRouter } = require("./routes/auth");
const { studentsRouter } = require("./routes/students");
const { attendanceRouter } = require("./routes/attendance");
const { adminManagementRouter } = require("./routes/adminManagement");
const { locationConfigRouter } = require("./routes/locationConfig");
const { publicRouter } = require("./routes/public");
const { whatsappRouter } = require("./routes/whatsapp");
const { initWhatsApp } = require("./lib/whatsappService");

const Admin = require("./models/Admin");

dotenv.config();

const app = express();

const getLocalIp = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
};

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/students", studentsRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/admins", adminManagementRouter);
app.use("/api/location-config", locationConfigRouter);
app.use("/api/public", publicRouter);
app.use("/api/whatsapp", whatsappRouter);

app.get("/api/public/network-ip", (req, res) => {
  res.json({ ip: getLocalIp(), port: process.env.PORT || 5000 });
});


// Serve static files from the React app
const clientPath = path.join(__dirname, "../../client/dist");
app.use(express.static(clientPath));

// The "catchall" handler
app.get("*", (req, res) => {
  res.sendFile(path.join(clientPath, "index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("[Global Error]", err);
  res.status(500).json({ error: "INTERNAL_SERVER_ERROR: " + (err.message || "Unknown Error") });
});

process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection]', err);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});

const port = Number(process.env.PORT || 5000);
const localIp = getLocalIp();

// Start Server immediately
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on:`);
  console.log(`  - Local:   http://localhost:${port}`);
  console.log(`  - Network: http://${localIp}:${port}`);
});

// Background DB Connection & Initialization
async function initialize() {
  try {
    await connectDb();
    
    const ensureAdmin = async (adminData) => {
      try {
        // Only set the password if we are creating the user for the first time
        const { password, ...otherData } = adminData;
        await Admin.updateOne(
          { username: adminData.username },
          { 
            $set: otherData,
            $setOnInsert: { password } 
          },
          { upsert: true }
        );
      } catch (err) {
        if (err.code !== 11000) throw err;
      }
    };

    await ensureAdmin({
      username: "Admin",
      password: "swarnamrutham",
      email: "swarnamrutham3@gmail.com",
      district: "Main",
      place: "Main",
      whatsappLink: "",
      status: "approved",
      role: "master"
    });

    await ensureAdmin({
      username: "vikasatarangini",
      password: "jeeyarswamy",
      email: "vikasatarangini4@gmail.com",
      district: "Karimnagar",
      place: "Huzurabad",
      whatsappLink: "",
      status: "approved",
      role: "admin"
    });

    console.log("Database initialized successfully");

    // Auto-init WhatsApp for all approved admins
    const activeAdmins = await Admin.find({ status: "approved" }).lean();
    for (const admin of activeAdmins) {
      if (admin.username) {
        initWhatsApp(admin.username).catch(err => 
          console.error(`[WhatsApp] Failed to auto-initialize for ${admin.username}:`, err)
        );
      }
    }
    // Also init for Master Admin
    initWhatsApp("Admin").catch(err => 
      console.error(`[WhatsApp] Failed to auto-initialize for Master Admin:`, err)
    );
  } catch (err) {
    console.error("Initialization failed:", err);
  }
}

initialize();
