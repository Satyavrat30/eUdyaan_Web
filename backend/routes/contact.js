const express = require("express");
const ContactMessage = require("../models/ContactMessage");

const router = express.Router();

router.post("/messages", async (req, res) => {
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
