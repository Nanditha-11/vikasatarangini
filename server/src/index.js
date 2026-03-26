const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const { connectDb } = require("./lib/db");
const { authRouter } = require("./routes/auth");
const { studentsRouter } = require("./routes/students");
const { attendanceRouter } = require("./routes/attendance");
const { adminManagementRouter } = require("./routes/adminManagement");
const Admin = require("./models/Admin");

dotenv.config();

const app = express();

const os = require("os");

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
    origin: true, // Allow all origins to make it easier to access across devices
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const path = require("path");

app.use("/api/auth", authRouter);
app.use("/api/students", studentsRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/admins", adminManagementRouter);

// Serve static files from the React app
const clientPath = path.join(__dirname, "../../client/dist");
app.use(express.static(clientPath));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get("*", (req, res) => {
  res.sendFile(path.join(clientPath, "index.html"));
});

const port = Number(process.env.PORT || 5000);

connectDb()
  .then(async () => {
    // Function to ensure an admin account exists
    // Function to ensure an admin account exists
    const ensureAdmin = async (adminData) => {
      try {
        await Admin.updateOne(
          { username: adminData.username },
          { $set: adminData },
          { upsert: true }
        );
      } catch (err) {
        if (err.code === 11000) {
          // Duplicate key error, likely already exists (race condition)
          console.log(`Admin account ${adminData.username} already exists or was created simultaneously.`);
        } else {
          throw err;
        }
      }
    };

    // Ensure the Master Admin exists (Automatically approved)
    await ensureAdmin({
      username: "Admin", 
      password: "swarnamrutham", 
      email: "vikasatarangini4@gmail.com",
      district: "Main",
      place: "Main",
      status: "approved",
      role: "master"
    });

    // Ensure vikasatarangini admin exists (Pending until masteradmin approves)
    await ensureAdmin({
      username: "vikasatarangini", 
      password: "jeeyarswamy",
      email: "vikasatarangini4@gmail.com",
      district: "Karimnagar",
      place: "Huzurabad",
      status: "approved",
      role: "admin"
    });

    const localIp = getLocalIp();
    app.listen(port, "0.0.0.0", () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on:`);
      console.log(`  - Local:   http://localhost:${port}`);
      console.log(`  - Network: http://${localIp}:${port}`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Failed to start server:", err);
    process.exit(1);
  });

