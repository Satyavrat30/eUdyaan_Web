const mongoose = require("mongoose");

const chatSupportLogSchema = new mongoose.Schema(
  {
    userId: { type: String, default: "" },
    clientIp: { type: String, default: "" },
    language: { type: String, default: "english" },
    message: { type: String, required: true, trim: true },
    reply: { type: String, default: "", trim: true },
    serious: { type: Boolean, default: false }
  },
  { timestamps: true }
);

chatSupportLogSchema.index({ createdAt: -1 });
chatSupportLogSchema.index({ userId: 1, createdAt: -1 });
chatSupportLogSchema.index({ serious: 1, createdAt: -1 });

module.exports = mongoose.model("ChatSupportLog", chatSupportLogSchema);
