const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const adminSessions = new Map();

/**
 * Fix #1: Admin password is now stored as a bcrypt hash.
 * In .env, set ADMIN_PASSWORD_HASH to the output of:
 *   node -e "const b=require('bcryptjs'); b.hash('yourpassword',12).then(console.log)"
 *
 * For backwards compatibility, if ADMIN_PASSWORD_HASH is not set,
 * the server will refuse to start admin login (no plaintext fallback).
 */
function getConfiguredAdminIdentity() {
  const email = String(process.env.ADMIN_EMAIL || "admin@eudyaan.local").trim().toLowerCase();
  const hashedPassword = String(process.env.ADMIN_PASSWORD_HASH || "").trim();
  return { email, hashedPassword };
}

function cleanupExpiredAdminSessions() {
  const now = Date.now();
  for (const [token, session] of adminSessions.entries()) {
    if (now >= session.expiresAt) adminSessions.delete(token);
  }
}

function createAdminSession(email) {
  cleanupExpiredAdminSessions();
  const token = crypto.randomBytes(32).toString("hex");
  adminSessions.set(token, { email, createdAt: Date.now(), expiresAt: Date.now() + ADMIN_SESSION_TTL_MS });
  return token;
}

function getAdminSession(token) {
  if (!token) return null;
  cleanupExpiredAdminSessions();
  const session = adminSessions.get(token) || null;
  if (!session) return null;
  if (Date.now() >= session.expiresAt) { adminSessions.delete(token); return null; }
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
  if (!session) return res.status(401).json({ error: "Admin login required" });
  req.admin = { email: session.email, token };
  return next();
}

module.exports = {
  getConfiguredAdminIdentity,
  createAdminSession,
  getAdminSession,
  removeAdminSession,
  requireAdminSession
};
