const mongoose = require("mongoose");

// Main connection for Admin collection
let mainConnection = null;

// Cache for tenant connections: { username: connection }
const tenantConnections = {};

async function connectDb() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/vikasatarangini";
  if (!uri) throw new Error("Missing MONGODB_URI env var");

  mongoose.set("strictQuery", true);
  
  // Connect the main mongoose instance (for models that use the default connection)
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
  mainConnection = mongoose.connection;
  console.log("Main MongoDB connected successfully");
}

/**
 * Returns a connection to a specific tenant's database.
 * Database name format: vikasatarangini_[username]
 */
function getTenantDb(username) {
  if (!username) throw new Error("Tenant username required");
  
  const dbName = `vikasatarangini_${username.toLowerCase()}`;
  
  if (tenantConnections[dbName]) {
    return tenantConnections[dbName];
  }

  // Use the same base URI but change the database name
  const baseUri = (process.env.MONGODB_URI || "mongodb://localhost:27017/vikasatarangini").split("?")[0];
  // Remove trailing slash if present
  const baseUriNoSlash = baseUri.endsWith("/") ? baseUri.slice(0, -1) : baseUri;
  // If the base URI already ends with a database name, we need to handle that.
  // But usually, it ends with a slash.
  
  // Robustly handle connection string to replace/append DB name
  const lastSlashIndex = baseUriNoSlash.lastIndexOf("/");
  const host = baseUriNoSlash.substring(0, lastSlashIndex + 1);
  const tenantUri = `${host}${dbName}${process.env.MONGODB_URI?.includes("?") ? "?" + process.env.MONGODB_URI.split("?")[1] : ""}`;

  console.log(`[DB] Creating connection for tenant: ${username} -> ${dbName}`);
  
  const connection = mongoose.createConnection(tenantUri, {
    serverSelectionTimeoutMS: 10000,
  });

  connection.on("connected", () => console.log(`[DB] Connected to tenant DB: ${dbName}`));
  connection.on("error", (err) => console.error(`[DB] ${dbName} connection error:`, err));

  tenantConnections[dbName] = connection;
  return connection;
}

module.exports = { connectDb, getTenantDb };

