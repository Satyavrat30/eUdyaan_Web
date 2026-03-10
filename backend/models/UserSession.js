const mongoose = require("mongoose");

const userSessionSchema = new mongoose.Schema({
  token:     { type: String, required: true, unique: true, index: true },
  userId:    { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expires: 0 } } // TTL auto-delete
});

module.exports = mongoose.model("UserSession", userSessionSchema);
