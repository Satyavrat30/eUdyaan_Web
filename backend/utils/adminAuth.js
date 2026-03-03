const crypto = require("crypto");

const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const adminSessions = new Map();

function getConfiguredAdminIdentity() {
  const email = String(process.env.ADMIN_EMAIL || "admin@eudyaan.local").trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || "").trim();
  return { email, password };
}

function cleanupExpiredAdminSessions() {
  const now = Date.now();
  for (const [token, session] of adminSessions.entries()) {
    if (now >= session.expiresAt) {
      adminSessions.delete(token);
    }
  }
}

function createAdminSession(email) {
  cleanupExpiredAdminSessions();
  const token = crypto.randomBytes(32).toString("hex");
  adminSessions.set(token, {
    email,
    createdAt: Date.now(),
    expiresAt: Date.now() + ADMIN_SESSION_TTL_MS
  });
  return token;
}

function getAdminSession(token) {
  if (!token) return null;
  cleanupExpiredAdminSessions();
  const session = adminSessions.get(token) || null;
  if (!session) return null;
  if (Date.now() >= session.expiresAt) {
    adminSessions.delete(token);
    return null;
  }
  session.expiresAt = Date.now() + ADMIN_SESSION_TTL_MS;
  adminSessions.set(token, session);
  return session;
}

function removeAdminSession(token) {
  adminSessions.delete(token);
}

function requireAdminSession(req, res, next) {
  const authHeader = String(req.headers.authorization || "").trim();
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const session = getAdminSession(token);
  if (!session) {
    return res.status(401).json({ error: "Admin login required" });
  }

  req.admin = {
    email: session.email,
    token
  };
  return next();
}

module.exports = {
  getConfiguredAdminIdentity,
  createAdminSession,
  getAdminSession,
  removeAdminSession,
  requireAdminSession
};
