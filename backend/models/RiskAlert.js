const mongoose = require("mongoose");

const riskAlertSchema = new mongoose.Schema(
  {
    source: { type: String, required: true, trim: true },
    userId: { type: String, default: "" },
    anonymousId: { type: String, default: "" },
    clientIp: { type: String, default: "" },
    message: { type: String, required: true, trim: true },
    triggerTerm: { type: String, default: "" },
    metadata: { type: Object, default: {} }
  },
  { timestamps: true }
);

riskAlertSchema.index({ createdAt: -1 });
riskAlertSchema.index({ source: 1, createdAt: -1 });
riskAlertSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("RiskAlert", riskAlertSchema);
