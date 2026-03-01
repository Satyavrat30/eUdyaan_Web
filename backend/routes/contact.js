const express = require("express");
const ContactMessage = require("../models/ContactMessage");
const User = require("../models/User");

const router = express.Router();

async function requireAuthenticatedUser(req, res, next) {
  try {
    const userId = String(req.body?.userId || "").trim();
    if (!/^[a-fA-F0-9]{24}$/.test(userId)) {
      return res.status(401).json({ error: "Login required" });
    }

    const user = await User.findById(userId, { _id: 1 }).lean();
    if (!user?._id) {
      return res.status(401).json({ error: "Login required" });
    }

    req.authUserId = String(user._id);
    return next();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

router.post("/messages", requireAuthenticatedUser, async (req, res) => {
  try {
    const { firstName, lastName, email, phone = "", message } = req.body;

    if (!firstName || !lastName || !email || !message) {
      return res.status(400).json({ error: "firstName, lastName, email, and message are required" });
    }

    const doc = await ContactMessage.create({
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: String(email).trim(),
      phone: String(phone).trim(),
      message: String(message).trim()
    });

    return res.status(201).json({
      success: true,
      message: "Message received",
      id: String(doc._id)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
