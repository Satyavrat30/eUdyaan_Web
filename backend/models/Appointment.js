const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    consultantName: { type: String, required: true, trim: true, maxlength: 120 },
    consultantRole: { type: String, required: true, trim: true, maxlength: 120 },
    appointmentType: { type: String, required: true, enum: ["Video Call", "In Person"] },
    appointmentDate: { type: Date, required: true },
    appointmentTime: { type: String, required: true, trim: true, maxlength: 40 },
    status: { type: String, default: "scheduled", enum: ["scheduled", "cancelled"] },
    cancelledAt: { type: Date, default: null }
  },
  { timestamps: true }
);

appointmentSchema.index({ userId: 1, createdAt: -1 });
appointmentSchema.index({ appointmentDate: 1, status: 1 });

module.exports = mongoose.model("Appointment", appointmentSchema);
