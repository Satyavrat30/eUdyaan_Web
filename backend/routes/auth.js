const express = require("express");
const router = express.Router();
const User = require("../models/User");
const UserSession = require("../models/UserSession");
const PendingVerification = require("../models/PendingVerification");
const PasswordResetToken = require("../models/PasswordResetToken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { makeAnonymousId } = require("../utils/anonymousId");
const {
  getConfiguredAdminIdentity,
  createAdminSession,
  removeAdminSession,
  requireAdminSession
} = require("../utils/adminAuth");

// ── Rate limiting buckets (in-memory, fine for login/signup throttle) ──────────
const adminLoginBuckets = new Map();
const loginBuckets = new Map();       // Fix #5: rate-limit user login
const signupBuckets = new Map();      // Fix #6: rate-limit signup

const ADMIN_LOGIN_WINDOW_MS = 10 * 60 * 1000;
const ADMIN_LOGIN_MAX_ATTEMPTS = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
const SIGNUP_WINDOW_MS = 60 * 60 * 1000;
const SIGNUP_MAX_ATTEMPTS = 5;

const USER_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : (typeof forwarded === "string" ? forwarded.split(",")[0] : req.ip);
  return String(ip || "unknown").trim();
}

function checkRateBucket(buckets, key, windowMs, maxAttempts) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now >= current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false };
  }
  current.count += 1;
  if (current.count > maxAttempts) {
    return { limited: true, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  return { limited: false };
}

function clearBucket(buckets, key) {
  buckets.delete(key);
}

function getTransporter() {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
}

function getPublicBaseUrl(req) {
  const configured = String(process.env.RENDER_EXTERNAL_URL || process.env.FRONTEND_URL || "").trim();
  if (configured) return configured.replace(/\/$/, "");

  const forwardedHost = req.headers["x-forwarded-host"];
  const hostValue = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : (forwardedHost || req.headers.host || "");
  const host = String(hostValue).split(",")[0].trim();
  if (!host) return "";

  const forwardedProto = req.headers["x-forwarded-proto"];
  const protoValue = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : (forwardedProto || "https");
  const proto = String(protoValue).split(",")[0].trim() || "https";
  return `${proto}://${host}`;
}

function validatePassword(password) {
  const errors = [];
  if (password.length < 8) errors.push("at least 8 characters");
  if (!/[A-Z]/.test(password)) errors.push("one uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("one lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("one number");
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push("one special character (!@#$%^&* etc.)");
  return errors;
}

// ── SIGNUP ────────────────────────────────────────────────────────────────────
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.json({ success: false, message: "Name, email and password are required." });
    }

    // Fix #6: rate-limit signup per IP
    const signupKey = getClientIp(req);
    const signupCheck = checkRateBucket(signupBuckets, signupKey, SIGNUP_WINDOW_MS, SIGNUP_MAX_ATTEMPTS);
    if (signupCheck.limited) {
      res.setHeader("Retry-After", String(signupCheck.retryAfterSeconds));
      return res.status(429).json({ success: false, message: "Too many signup attempts. Please try again later." });
    }

    const pwErrors = validatePassword(password);
    if (pwErrors.length > 0) {
      return res.json({ success: false, message: `Password must contain: ${pwErrors.join(", ")}.` });
    }

    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.json({ success: false, message: "User already exists. Please login." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Fix #3: Store in MongoDB with TTL
    await PendingVerification.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { token, name: name.trim(), email: email.toLowerCase().trim(), hashedPassword, expiresAt },
      { upsert: true, new: true }
    );

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const verifyUrl = `${getPublicBaseUrl(req)}/api/auth/verify-email?token=${token}`;
      const transporter = getTransporter();
      await transporter.sendMail({
        from: `"eUdyaan" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Verify your eUdyaan account",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border-radius:12px;background:#f0f4f0;">
            <h2 style="color:#3a5a40;">Welcome to eUdyaan, ${name.trim()}!</h2>
            <p>Please verify your email to activate your account.</p>
            <a href="${verifyUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#5f6f52;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">Verify Email</a>
            <p style="color:#888;font-size:13px;">This link expires in 24 hours. If you did not sign up, ignore this email.</p>
          </div>
        `
      });
      return res.json({ success: true, emailSent: true, message: "Signup successful! Please check your email to verify your account before logging in." });
    } else {
      // Dev mode — auto-verify
      const newUser = new User({ name: name.trim(), email: email.toLowerCase().trim(), password: hashedPassword, isVerified: true });
      await newUser.save();
      await PendingVerification.deleteOne({ token });
      return res.json({ success: true, emailSent: false, message: "Signup successful! You can now login." });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── RESEND VERIFICATION EMAIL (Fix #15) ───────────────────────────────────────
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.json({ success: false, message: "Email is required." });

    // Always respond the same way to prevent email enumeration
    const pending = await PendingVerification.findOne({ email: email.toLowerCase().trim() });
    if (pending && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      pending.token = token;
      pending.expiresAt = expiresAt;
      await pending.save();

      const verifyUrl = `${getPublicBaseUrl(req)}/api/auth/verify-email?token=${token}`;
      const transporter = getTransporter();
      await transporter.sendMail({
        from: `"eUdyaan" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Verify your eUdyaan account (resent)",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border-radius:12px;background:#f0f4f0;">
            <h2 style="color:#3a5a40;">Email Verification</h2>
            <p>Here is your new verification link. The previous one has been invalidated.</p>
            <a href="${verifyUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#5f6f52;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">Verify Email</a>
            <p style="color:#888;font-size:13px;">This link expires in 24 hours.</p>
          </div>
        `
      });
    }
    return res.json({ success: true, message: "If this email has a pending verification, a new link has been sent." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── EMAIL VERIFICATION ────────────────────────────────────────────────────────
router.get("/verify-email", async (req, res) => {
  const { token } = req.query;
  // Fix #3: look up from MongoDB instead of in-memory Map
  const pending = await PendingVerification.findOne({ token }).lean();

  if (!pending) return res.send("<h3>Invalid or expired verification link. Please sign up again.</h3>");
  if (Date.now() > new Date(pending.expiresAt).getTime()) {
    await PendingVerification.deleteOne({ token });
    return res.send("<h3>This verification link has expired. <a href='/forgot-password.html'>Request a new one</a>.</h3>");
  }

  try {
    const existing = await User.findOne({ email: pending.email });
    if (!existing) {
      const newUser = new User({ name: pending.name, email: pending.email, password: pending.hashedPassword, isVerified: true });
      await newUser.save();
    }
    await PendingVerification.deleteOne({ token });
    return res.redirect("/login.html?verified=1");
  } catch (err) {
    return res.status(500).send("Verification failed. Please try again.");
  }
});

// ── LOGIN ─────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.json({ success: false, message: "Please enter email and password." });
    }

    // Fix #5: rate-limit login per IP+email
    const loginKey = `${getClientIp(req)}|${String(email).trim().toLowerCase()}`;
    const loginCheck = checkRateBucket(loginBuckets, loginKey, LOGIN_WINDOW_MS, LOGIN_MAX_ATTEMPTS);
    if (loginCheck.limited) {
      res.setHeader("Retry-After", String(loginCheck.retryAfterSeconds));
      return res.status(429).json({ success: false, message: "Too many login attempts. Please try again later." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.json({ success: false, message: "No account found with this email.", notRegistered: true });
    }

    if (process.env.EMAIL_USER && !user.isVerified) {
      return res.json({ success: false, message: "Please verify your email before logging in. Check your inbox." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Incorrect password. Please try again." });
    }

    // Fix #2: create a server-side session token
    const sessionToken = crypto.randomBytes(32).toString("hex");
    await UserSession.create({
      token: sessionToken,
      userId: String(user._id),
      expiresAt: new Date(Date.now() + USER_SESSION_TTL_MS)
    });

    clearBucket(loginBuckets, loginKey);

    return res.json({
      success: true,
      message: "Login successful",
      sessionToken,
      user: { id: String(user._id), name: user.name, email: user.email }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── LOGOUT ────────────────────────────────────────────────────────────────────
router.post("/logout", async (req, res) => {
  try {
    const authHeader = String(req.headers.authorization || "").trim();
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (token) await UserSession.deleteOne({ token });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── FORGOT PASSWORD ───────────────────────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always return success to prevent email enumeration
    if (!user) return res.json({ success: true, message: "If this email is registered, a reset link has been sent." });

    const token = crypto.randomBytes(32).toString("hex");
    // Fix #3: Store in MongoDB
    await PasswordResetToken.findOneAndUpdate(
      { userId: String(user._id) },
      { token, userId: String(user._id), expiresAt: new Date(Date.now() + 60 * 60 * 1000), used: false },
      { upsert: true, new: true }
    );

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const resetUrl = `${getPublicBaseUrl(req)}/reset-password.html?token=${token}`;
      const transporter = getTransporter();
      await transporter.sendMail({
        from: `"eUdyaan" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "Reset your eUdyaan password",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border-radius:12px;background:#f0f4f0;">
            <h2 style="color:#3a5a40;">Password Reset</h2>
            <p>You requested a password reset for your eUdyaan account.</p>
            <a href="${resetUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#5f6f52;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">Reset Password</a>
            <p style="color:#888;font-size:13px;">This link expires in 1 hour. If you did not request this, ignore this email.</p>
          </div>
        `
      });
    }
    return res.json({ success: true, message: "If this email is registered, a reset link has been sent." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── RESET PASSWORD ────────────────────────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    // Fix #3: look up from MongoDB
    const record = await PasswordResetToken.findOne({ token, used: false }).lean();

    if (!record || Date.now() > new Date(record.expiresAt).getTime()) {
      return res.json({ success: false, message: "Reset link is invalid or has expired." });
    }

    const pwErrors = validatePassword(newPassword);
    if (pwErrors.length > 0) {
      return res.json({ success: false, message: `Password must contain: ${pwErrors.join(", ")}.` });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const user = await User.findByIdAndUpdate(record.userId, { password: hashedPassword });
    await PasswordResetToken.deleteOne({ token });

    // Fix #14: Send password change notification email
    if (user && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const transporter = getTransporter();
        await transporter.sendMail({
          from: `"eUdyaan" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: "Your eUdyaan password was changed",
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border-radius:12px;background:#f0f4f0;">
              <h2 style="color:#3a5a40;">Password Changed</h2>
              <p>Your eUdyaan account password was successfully changed.</p>
              <p>If you did not make this change, please contact us immediately or use the forgot password option to secure your account.</p>
            </div>
          `
        });
      } catch (_) { /* non-critical, do not fail the request */ }
    }

    return res.json({ success: true, message: "Password reset successful. You can now login." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── ADMIN: Lookup user by anonymousId ─────────────────────────────────────────
router.get("/admin/lookup-anonymous", requireAdminSession, async (req, res) => {
  try {
    const { anonymousId } = req.query;
    const users = await User.find({}, { name: 1, email: 1, _id: 1 });
    // Fix #11: use shared makeAnonymousId utility
    const match = users.find(u => makeAnonymousId(String(u._id)) === anonymousId);
    if (!match) return res.json({ found: false });
    return res.json({ found: true, name: match.name, email: match.email, id: String(match._id) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── ADMIN LOGIN ───────────────────────────────────────────────────────────────
router.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const configured = getConfiguredAdminIdentity();

    if (!configured.hashedPassword) {
      return res.status(500).json({ error: "Admin credentials are not configured on server" });
    }

    const inputEmail = String(email || "").trim().toLowerCase();
    const inputPassword = String(password || "").trim();

    const attempt = checkRateBucket(adminLoginBuckets, `${getClientIp(req)}|${inputEmail}`, ADMIN_LOGIN_WINDOW_MS, ADMIN_LOGIN_MAX_ATTEMPTS);
    if (attempt.limited) {
      res.setHeader("Retry-After", String(attempt.retryAfterSeconds));
      return res.status(429).json({ error: "Too many login attempts. Please try again later." });
    }

    if (!inputEmail || !inputPassword) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Fix #1: compare against bcrypt hash
    const emailMatches = inputEmail === configured.email;
    const passwordMatches = await bcrypt.compare(inputPassword, configured.hashedPassword);

    if (!emailMatches || !passwordMatches) {
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    clearBucket(adminLoginBuckets, `${getClientIp(req)}|${inputEmail}`);

    const token = createAdminSession(configured.email);
    return res.json({ success: true, token, admin: { email: configured.email, role: "admin" } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/admin/logout", requireAdminSession, async (req, res) => {
  removeAdminSession(req.admin.token);
  return res.json({ success: true });
});

router.get("/admin/me", requireAdminSession, async (req, res) => {
  return res.json({ authenticated: true, admin: { email: req.admin.email, role: "admin" } });
});

module.exports = router;
