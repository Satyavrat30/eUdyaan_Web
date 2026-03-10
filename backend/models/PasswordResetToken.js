const mongoose = require("mongoose");

const passwordResetTokenSchema = new mongoose.Schema({
  token:     { type: String, required: true, unique: true, index: true },
  userId:    { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index
  used:      { type: Boolean, default: false }
});

module.exports = mongoose.model("PasswordResetToken", passwordResetTokenSchema);
