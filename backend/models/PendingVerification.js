const mongoose = require("mongoose");

const pendingVerificationSchema = new mongoose.Schema({
  token:          { type: String, required: true, unique: true, index: true },
  name:           { type: String, required: true },
  email:          { type: String, required: true, lowercase: true, trim: true },
  hashedPassword: { type: String, required: true },
  expiresAt:      { type: Date, required: true, index: { expires: 0 } } // TTL index
});

module.exports = mongoose.model("PendingVerification", pendingVerificationSchema);
