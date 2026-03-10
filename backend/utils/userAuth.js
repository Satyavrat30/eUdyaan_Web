const UserSession = require("../models/UserSession");

/**
 * Fix #2: Validates the Bearer session token from Authorization header.
 * This replaces the pattern of trusting userId from req.body.
 */
async function requireUserSession(req, res, next) {
  try {
    const authHeader = String(req.headers.authorization || "").trim();
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!token) return res.status(401).json({ error: "Login required" });

    const session = await UserSession.findOne({ token }).lean();
    if (!session || Date.now() > new Date(session.expiresAt).getTime()) {
      if (session) await UserSession.deleteOne({ token });
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }

    req.authUserId = String(session.userId);
    return next();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = { requireUserSession };
