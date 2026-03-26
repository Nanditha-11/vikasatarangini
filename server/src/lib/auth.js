const jwt = require("jsonwebtoken");

function signAdminToken(admin) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET env var");
  return jwt.sign({ 
    role: "admin", 
    username: admin.username,
    district: admin.district,
    place: admin.place 
  }, secret, { expiresIn: "7d" });
}

function requireAuth(req, res, next) {
  let token = "";
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    token = header.split(" ")[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("Missing JWT_SECRET env var");
    const payload = jwt.verify(token, secret);
    if (!payload || payload.role !== "admin") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

module.exports = { signAdminToken, requireAuth };

