const mongoose = require("mongoose");

const contactMessageSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: "", trim: true, maxlength: 30 },
    message: { type: String, required: true, trim: true, maxlength: 2000 }
  },
  { timestamps: true }
);

contactMessageSchema.index({ createdAt: -1 });
contactMessageSchema.index({ email: 1 });

module.exports = mongoose.model("ContactMessage", contactMessageSchema);
