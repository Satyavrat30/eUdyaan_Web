const express = require("express");
const router = express.Router();
const User = require("../models/User");

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.json({ success: false, message: "User already exists" });
    }

    const newUser = new User({ name, email, password });
    await newUser.save();

    return res.json({
      success: true,
      message: "Signup successful",
      user: {
        id: String(newUser._id),
        name: newUser.name,
        email: newUser.email
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, password });
    if (!user) {
      return res.json({ success: false, message: "Invalid credentials" });
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

module.exports = router;
