const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const {
  getConfiguredAdminIdentity,
  createAdminSession,
  removeAdminSession,
  requireAdminSession
} = require("../utils/adminAuth");

// In-memory store for email verification tokens (use Redis/DB in production)
const pendingVerifications = new Map(); // token -> { name, email, hashedPassword, expiresAt }
const passwordResetTokens = new Map(); // token -> { userId, expiresAt }
const adminLoginBuckets = new Map(); // key -> { count, resetAt }
const ADMIN_LOGIN_WINDOW_MS = 10 * 60 * 1000;
const ADMIN_LOGIN_MAX_ATTEMPTS = 8;

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : (typeof forwarded === "string" ? forwarded.split(",")[0] : req.ip);
  return String(ip || "unknown").trim();
}

function consumeAdminLoginAttempt(req, email) {
  const key = `${getClientIp(req)}|${String(email || "").trim().toLowerCase()}`;
  const now = Date.now();
  const current = adminLoginBuckets.get(key);

  if (!current || now >= current.resetAt) {
    adminLoginBuckets.set(key, { count: 1, resetAt: now + ADMIN_LOGIN_WINDOW_MS });
    return { limited: false, retryAfterSeconds: 0 };
  }

  current.count += 1;
  if (current.count > ADMIN_LOGIN_MAX_ATTEMPTS) {
    return {
      limited: true,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    };
  }

  return { limited: false, retryAfterSeconds: 0 };
}

function clearAdminLoginAttempt(req, email) {
  const key = `${getClientIp(req)}|${String(email || "").trim().toLowerCase()}`;
  adminLoginBuckets.delete(key);
}

// Email transporter setup (uses env variables)
function getTransporter() {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// Password strength validator
function validatePassword(password) {
  const errors = [];
  if (password.length < 8) errors.push("at least 8 characters");
  if (!/[A-Z]/.test(password)) errors.push("one uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("one lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("one number");
  if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password)) errors.push("one special character (!@#$%^&* etc.)");
  return errors;
}

// SIGNUP - sends verification email
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.json({ success: false, message: "Name, email and password are required." });
    }

    // Password strength check
    const pwErrors = validatePassword(password);
    if (pwErrors.length > 0) {
      return res.json({
        success: false,
        message: `Password must contain: ${pwErrors.join(", ")}.`
      });
    }

    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.json({ success: false, message: "User already exists. Please login." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate verification token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    pendingVerifications.set(token, {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      hashedPassword,
      expiresAt
    });

    // Send verification email (if email is configured)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const verifyUrl = `${process.env.FRONTEND_URL || `http://localhost:5000`}/api/auth/verify-email?token=${token}`;
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
      return res.json({
        success: true,
        emailSent: true,
        message: "Signup successful! Please check your email to verify your account before logging in."
      });
    } else {
      // Email not configured — auto-verify and create user immediately (dev mode)
      const newUser = new User({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        isVerified: true
      });
      await newUser.save();
      pendingVerifications.delete(token);
      return res.json({
        success: true,
        emailSent: false,
        message: "Signup successful! You can now login."
      });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// EMAIL VERIFICATION
router.get("/verify-email", async (req, res) => {
  const { token } = req.query;
  const pending = pendingVerifications.get(token);

  if (!pending) {
    return res.send(`<h3>Invalid or expired verification link. Please sign up again.</h3>`);
  }
  if (Date.now() > pending.expiresAt) {
    pendingVerifications.delete(token);
    return res.send(`<h3>This verification link has expired. Please sign up again.</h3>`);
  }

  try {
    const existing = await User.findOne({ email: pending.email });
    if (!existing) {
      const newUser = new User({
        name: pending.name,
        email: pending.email,
        password: pending.hashedPassword,
        isVerified: true
      });
      await newUser.save();
    }
    pendingVerifications.delete(token);
    return res.redirect("/login.html?verified=1");
  } catch (err) {
    return res.status(500).send("Verification failed. Please try again.");
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.json({ success: false, message: "Please enter email and password." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.json({
        success: false,
        message: "No account found with this email.",
        notRegistered: true
      });
    }

    // Check email verification (if using email)
    if (process.env.EMAIL_USER && !user.isVerified) {
      return res.json({
        success: false,
        message: "Please verify your email before logging in. Check your inbox."
      });
    }

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Incorrect password. Please try again." });
    }

    return res.json({
      success: true,
      message: "Login successful",
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// FORGOT PASSWORD - send reset link
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: "If this email is registered, a reset link has been sent." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    passwordResetTokens.set(token, { userId: String(user._id), expiresAt: Date.now() + 60 * 60 * 1000 });

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5000"}/reset-password.html?token=${token}`;
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

// RESET PASSWORD
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const record = passwordResetTokens.get(token);

    if (!record || Date.now() > record.expiresAt) {
      return res.json({ success: false, message: "Reset link is invalid or has expired." });
    }

    const pwErrors = validatePassword(newPassword);
    if (pwErrors.length > 0) {
      return res.json({
        success: false,
        message: `Password must contain: ${pwErrors.join(", ")}.`
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(record.userId, { password: hashedPassword });
    passwordResetTokens.delete(token);

    return res.json({ success: true, message: "Password reset successful. You can now login." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ADMIN: Lookup user by anonymousId (for admin use)
router.get("/admin/lookup-anonymous", requireAdminSession, async (req, res) => {
  try {
    const { anonymousId } = req.query;
    // Reverse the anonymousId hash by iterating all users
    const users = await User.find({}, { name: 1, email: 1, _id: 1 });
    function makeAnonId(seed) {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
      return `ANON-${String(hash % 1000000).padStart(6, "0")}`;
    }
    const match = users.find(u => makeAnonId(String(u._id)) === anonymousId);
    if (!match) return res.json({ found: false });
    return res.json({ found: true, name: match.name, email: match.email, id: String(match._id) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const configured = getConfiguredAdminIdentity();

    if (!configured.password) {
      return res.status(500).json({ error: "Admin credentials are not configured on server" });
    }

    const inputEmail = String(email || "").trim().toLowerCase();
    const inputPassword = String(password || "").trim();

    const attempt = consumeAdminLoginAttempt(req, inputEmail);
    if (attempt.limited) {
      res.setHeader("Retry-After", String(attempt.retryAfterSeconds));
      return res.status(429).json({ error: "Too many login attempts. Please try again later." });
    }

    if (!inputEmail || !inputPassword) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (inputEmail !== configured.email || inputPassword !== configured.password) {
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    clearAdminLoginAttempt(req, inputEmail);

    const token = createAdminSession(configured.email);
    return res.json({
      success: true,
      token,
      admin: {
        email: configured.email,
        role: "admin"
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/admin/logout", requireAdminSession, async (req, res) => {
  removeAdminSession(req.admin.token);
  return res.json({ success: true });
});

router.get("/admin/me", requireAdminSession, async (req, res) => {
  return res.json({
    authenticated: true,
    admin: {
      email: req.admin.email,
      role: "admin"
    }
  });
});

module.exports = router;
