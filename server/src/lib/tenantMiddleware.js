const { getTenantDb } = require("./db");
const { getTenantModels } = require("./tenantModels");

/**
 * Middleware that attaches tenant-specific database and models to the request.
 * Must be used AFTER requireAuth or anywhere req.user is populated.
 */
function tenantMiddleware(req, res, next) {
  try {
    const username = req.user?.username;
    if (!username) {
      return res.status(401).json({ error: "Unauthorized: Username missing in request" });
    }

    const connection = getTenantDb(username);
    req.tenantDb = connection;
    req.tenantModels = getTenantModels(connection);
    
    next();
  } catch (err) {
    console.error("[TenantMiddleware] Error:", err);
    res.status(500).json({ error: "Failed to establish tenant database connection" });
  }
}

module.exports = { tenantMiddleware };
