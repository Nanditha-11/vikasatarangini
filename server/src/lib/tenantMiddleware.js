const { getTenantDb } = require("./db");
const { getTenantModels } = require("./tenantModels");

/**
 * Middleware that attaches tenant-specific database and models to the request.
 * Must be used AFTER requireAuth or anywhere req.user is populated.
 */
async function tenantMiddleware(req, res, next) {
  try {
    const user = req.user;
    if (!user || !user.username) {
      return res.status(401).json({ error: "Unauthorized: User missing" });
    }

    let tenantUsername = user.username;

    // Smart Resolution for Master Admin
    if (user.role === "master") {
      const targetDistrict = req.headers["x-view-district"] || req.query.district;
      const targetPlace = req.headers["x-view-place"] || req.query.place;

      if (targetDistrict && targetPlace) {
        // Find the owner of this district/place from the main Admin collection
        const Admin = require("../models/Admin");
        const targetAdmin = await Admin.findOne({ 
          district: targetDistrict, 
          place: targetPlace,
          status: "approved" 
        }).lean();

        if (targetAdmin) {
          console.log(`[TenantMiddleware] Master viewing ${targetDistrict}/${targetPlace}. Resolving to tenant: ${targetAdmin.username}`);
          tenantUsername = targetAdmin.username;
        } else {
          console.warn(`[TenantMiddleware] Master viewing ${targetDistrict}/${targetPlace} but NO OWNER FOUND. Falling back to ${tenantUsername}`);
        }
      }
    }

    const connection = getTenantDb(tenantUsername);
    req.tenantDb = connection;
    req.tenantModels = getTenantModels(connection);
    
    next();
  } catch (err) {
    console.error("[TenantMiddleware] Error:", err);
    res.status(500).json({ error: "Failed to establish tenant database connection" });
  }
}

module.exports = { tenantMiddleware };
