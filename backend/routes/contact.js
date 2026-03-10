const express = require("express");
const ContactMessage = require("../models/ContactMessage");
const { requireUserSession } = require("../utils/userAuth");  // Fix #2

const router = express.Router();

// Fix #10: Strip HTML to prevent XSS stored in messages
function sanitizeText(value) {
  return String(value || "").replace(/<[^>]*>/g, "").trim();
}

router.post("/messages", requireUserSession, async (req, res) => {
  try {
    const { firstName, lastName, email, phone = "", message } = req.body;

    if (!firstName || !lastName || !email || !message) {
      return res.status(400).json({ error: "firstName, lastName, email, and message are required" });
    }

    const doc = await ContactMessage.create({
      firstName: sanitizeText(firstName),
      lastName: sanitizeText(lastName),
      email: sanitizeText(email),
      phone: sanitizeText(phone),
      message: sanitizeText(message)
    });

    return res.status(201).json({ success: true, message: "Message received", id: String(doc._id) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
