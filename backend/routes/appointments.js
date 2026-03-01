const express = require("express");
const User = require("../models/User");
const Appointment = require("../models/Appointment");

const router = express.Router();

async function resolveAuthenticatedUserId(req) {
  const sources = [req.body?.userId, req.query?.userId, req.headers["x-user-id"]];
  const raw = sources.find((value) => typeof value === "string" && value.trim().length > 0) || "";
  const userId = String(raw).trim();

  if (!/^[a-fA-F0-9]{24}$/.test(userId)) {
    return "";
  }

  const user = await User.findById(userId, { _id: 1 }).lean();
  return user?._id ? String(user._id) : "";
}

async function requireAuthenticatedUser(req, res, next) {
  try {
    const userId = await resolveAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Login required" });
    }

    req.authUserId = userId;
    return next();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

function mapAppointment(doc) {
  return {
    id: String(doc._id),
    consultantName: doc.consultantName,
    consultantRole: doc.consultantRole,
    appointmentType: doc.appointmentType,
    appointmentDate: doc.appointmentDate,
    appointmentTime: doc.appointmentTime,
    status: doc.status,
    cancelledAt: doc.cancelledAt,
    createdAt: doc.createdAt
  };
}

router.post("/", requireAuthenticatedUser, async (req, res) => {
  try {
    const {
      consultantName,
      consultantRole,
      appointmentType,
      appointmentDate,
      appointmentTime
    } = req.body || {};

    const parsedDate = new Date(String(appointmentDate || ""));

    if (!consultantName || !consultantRole || !appointmentType || !appointmentTime || Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "consultantName, consultantRole, appointmentType, appointmentDate, and appointmentTime are required" });
    }

    const doc = await Appointment.create({
      userId: req.authUserId,
      consultantName: String(consultantName).trim(),
      consultantRole: String(consultantRole).trim(),
      appointmentType: String(appointmentType).trim(),
      appointmentDate: parsedDate,
      appointmentTime: String(appointmentTime).trim()
    });

    return res.status(201).json({
      success: true,
      appointment: mapAppointment(doc)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/", requireAuthenticatedUser, async (req, res) => {
  try {
    const docs = await Appointment.find({ userId: req.authUserId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      appointments: docs.map(mapAppointment)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete("/:appointmentId", requireAuthenticatedUser, async (req, res) => {
  try {
    const { appointmentId } = req.params;

    if (!/^[a-fA-F0-9]{24}$/.test(String(appointmentId || "").trim())) {
      return res.status(400).json({ error: "Invalid appointment id" });
    }

    const updated = await Appointment.findOneAndUpdate(
      {
        _id: String(appointmentId).trim(),
        userId: req.authUserId,
        status: { $ne: "cancelled" }
      },
      {
        $set: {
          status: "cancelled",
          cancelledAt: new Date()
        }
      },
      { returnDocument: "after" }
    ).lean();

    if (!updated) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    return res.json({
      success: true,
      appointment: mapAppointment(updated)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
