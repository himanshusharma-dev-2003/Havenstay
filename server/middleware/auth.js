const jwt  = require("jsonwebtoken");
const User = require("../models/User");

// ── Verify access token ───────────────────────────────────────────
const verifyToken = async (req, res, next) => {
  try {
    // Accept token from Authorization header OR httpOnly cookie
    let token =
      req.cookies?.accessToken ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (!token) {
      return res.status(401).json({ success: false, message: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Attach user to request (lightweight — no DB call needed for most routes)
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired. Please refresh." });
    }
    return res.status(401).json({ success: false, message: "Invalid token." });
  }
};

// ── Verify admin role ─────────────────────────────────────────────
const verifyAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Access denied. Admin role required." });
  }
  next();
};

// ── Verify admin or owner role ────────────────────────────────────
const verifyOwnerOrAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "owner")) {
    return res.status(403).json({ success: false, message: "Access denied. Admin or Owner role required." });
  }
  next();
};

// ── Optional auth (attach user if token present, else continue) ───
const optionalAuth = async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    }
  } catch (_) {
    // silently skip invalid tokens for optional auth
  }
  next();
};

module.exports = { verifyToken, verifyAdmin, verifyOwnerOrAdmin, optionalAuth };
