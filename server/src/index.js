const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const { connectDb } = require("./lib/db");
const { authRouter } = require("./routes/auth");
const { studentsRouter } = require("./routes/students");
const { attendanceRouter } = require("./routes/attendance");
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
    // Sync Admin credentials from ENV to DB if empty
    // Ensure the default 'admin' account exists
    await Admin.findOneAndUpdate(
      { username: "admin" },
      { 
        username: "admin", 
        password: "jeeyarswamy",
        email: "vikasatarangini4@gmail.com",
        district: "Headquarters",
        place: "Headquarters"
      },
      { upsert: true }
    );

    // Ensure the 'vikasatarangini' account exists for Huzurabad
    await Admin.findOneAndUpdate(
      { username: "vikasatarangini" },
      { 
        username: "vikasatarangini", 
        password: "jeeyarswamy",
        email: "vikasatarangini4@gmail.com",
        district: "Karimnagar",
        place: "Huzurabad"
      },
      { upsert: true }
    );

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

