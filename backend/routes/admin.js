const express = require("express");
const User = require("../models/User");
const CommunityPost = require("../models/CommunityPost");
const ContactMessage = require("../models/ContactMessage");
const Appointment = require("../models/Appointment");
const ChatSupportLog = require("../models/ChatSupportLog");
const RiskAlert = require("../models/RiskAlert");
const { detectRiskSignal } = require("../utils/riskSignals");
const { requireAdminSession } = require("../utils/adminAuth");

const router = express.Router();
const AI_RISK_SOURCE_REGEX = /^(ai_.*|.*chatbot.*|ai_support)$/i;

router.use(requireAdminSession);

function parseLimit(raw, fallback = 50, max = 200) {
  const value = Number(raw);
  if (Number.isNaN(value) || value <= 0) return fallback;
  return Math.min(value, max);
}

function parseOffset(raw, fallback = 0) {
  const value = Number(raw);
  if (Number.isNaN(value) || value < 0) return fallback;
  return Math.floor(value);
}

function normalizeUserId(value) {
  const id = String(value || "").trim();
  return /^[a-fA-F0-9]{24}$/.test(id) ? id : "";
}

function classifyRiskSource(source) {
  const value = String(source || "").toLowerCase();
  if (AI_RISK_SOURCE_REGEX.test(value)) {
    return "ai_assistant_chatbot";
  }
  return "community";
}

function normalizeRiskCategory(value) {
  const category = String(value || "").trim().toLowerCase();
  if (category === "violence") return "violence";
  if (category === "self_harm" || category === "self-harm") return "self_harm";
  return "high_risk";
}

function resolveRiskCategory(alert) {
  const metadataCategory = normalizeRiskCategory(alert?.metadata?.riskCategory);
  if (metadataCategory !== "high_risk") {
    return metadataCategory;
  }

  const fromMessage = detectRiskSignal(String(alert?.message || ""));
  if (fromMessage.matched) {
    return fromMessage.category;
  }

  const fromTrigger = detectRiskSignal(String(alert?.triggerTerm || ""));
  if (fromTrigger.matched) {
    return fromTrigger.category;
  }

  return "high_risk";
}

async function buildUserMap(userIds) {
  const ids = [...new Set(userIds.map(normalizeUserId).filter(Boolean))];
  if (!ids.length) return new Map();

  const users = await User.find({ _id: { $in: ids } }, { name: 1, email: 1 }).lean();
  const map = new Map();
  users.forEach((user) => {
    map.set(String(user._id), {
      id: String(user._id),
      name: user.name,
      email: user.email
    });
  });
  return map;
}

function flattenReplies(postId, replies = [], parentReplyId = "") {
  let flat = [];
  for (const reply of replies) {
    const replyId = String(reply._id || reply.id || "");
    flat.push({
      type: "reply",
      postId,
      replyId,
      parentReplyId,
      userId: String(reply.userId || ""),
      anonymousId: String(reply.anonymousId || ""),
      content: String(reply.content || ""),
      createdAt: reply.createdAt,
      updatedAt: reply.updatedAt
    });

    const nested = flattenReplies(postId, reply.replies || [], replyId);
    if (nested.length) {
      flat = flat.concat(nested);
    }
  }
  return flat;
}

router.get("/dashboard/summary", async (req, res) => {
  try {
    const [
      userCount,
      postCount,
      chatCount,
      riskAlertCount,
      contactCount,
      appointmentCount
    ] = await Promise.all([
      User.countDocuments(),
      CommunityPost.countDocuments(),
      ChatSupportLog.countDocuments(),
      RiskAlert.countDocuments(),
      ContactMessage.countDocuments(),
      Appointment.countDocuments()
    ]);

    const [seriousChatCount, riskAlertAiCount, riskAlertCommunityCount] = await Promise.all([
      ChatSupportLog.countDocuments({ serious: true }),
      RiskAlert.countDocuments({ source: { $regex: AI_RISK_SOURCE_REGEX } }),
      RiskAlert.countDocuments({ source: { $not: { $regex: AI_RISK_SOURCE_REGEX } } })
    ]);

    return res.json({
      success: true,
      summary: {
        users: userCount,
        communityPosts: postCount,
        chats: chatCount,
        seriousChats: seriousChatCount,
        riskAlerts: riskAlertCount,
        riskAlertsAiAssistantChatbot: riskAlertAiCount,
        riskAlertsCommunity: riskAlertCommunityCount,
        contactMessages: contactCount,
        appointments: appointmentCount
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/dashboard/chats", async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 100, 500);
    const offset = parseOffset(req.query.offset, 0);
    const seriousFilter = String(req.query.serious || "all").trim().toLowerCase();
    const chatQuery = {};
    if (seriousFilter === "true") {
      chatQuery.serious = true;
    } else if (seriousFilter === "false") {
      chatQuery.serious = false;
    }

    const logs = await ChatSupportLog.find(chatQuery)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const userMap = await buildUserMap(logs.map((log) => log.userId));

    const items = logs.map((log) => {
      const userId = normalizeUserId(log.userId);
      return {
        id: String(log._id),
        userId,
        user: userMap.get(userId) || null,
        clientIp: log.clientIp || "",
        language: log.language || "english",
        message: log.message,
        reply: log.reply,
        serious: Boolean(log.serious),
        createdAt: log.createdAt
      };
    });

    return res.json({
      success: true,
      chats: items,
      filters: { serious: seriousFilter }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/dashboard/risk-alerts", async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 100, 500);
    const offset = parseOffset(req.query.offset, 0);
    const sourceType = String(req.query.sourceType || "all").trim().toLowerCase();
    const sourceQuery = {};
    if (sourceType === "ai_assistant_chatbot") {
      sourceQuery.source = { $regex: AI_RISK_SOURCE_REGEX };
    } else if (sourceType === "community") {
      sourceQuery.source = { $not: { $regex: AI_RISK_SOURCE_REGEX } };
    }

    const alerts = await RiskAlert.find(sourceQuery)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const userMap = await buildUserMap(alerts.map((alert) => alert.userId));

    const items = alerts.map((alert) => {
      const userId = normalizeUserId(alert.userId);
      return {
        id: String(alert._id),
        source: alert.source,
        sourceType: classifyRiskSource(alert.source),
        riskCategory: resolveRiskCategory(alert),
        userId,
        user: userMap.get(userId) || null,
        anonymousId: alert.anonymousId || "",
        clientIp: alert.clientIp || "",
        triggerTerm: alert.triggerTerm || "",
        message: alert.message,
        metadata: alert.metadata || {},
        createdAt: alert.createdAt
      };
    });

    return res.json({ success: true, riskAlerts: items });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/dashboard/community", async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 100, 500);
    const offset = parseOffset(req.query.offset, 0);
    const posts = await CommunityPost.find({})
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const postEntries = posts.map((post) => ({
      type: "post",
      postId: String(post._id),
      userId: String(post.userId || ""),
      anonymousId: String(post.anonymousId || ""),
      title: String(post.title || ""),
      content: String(post.content || ""),
      tags: post.tags || [],
      likes: Number(post.likes || 0),
      createdAt: post.createdAt,
      updatedAt: post.updatedAt
    }));

    const replyEntries = posts.flatMap((post) => flattenReplies(String(post._id), post.replies || []));
    const combined = [...postEntries, ...replyEntries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const userMap = await buildUserMap(combined.map((item) => item.userId));
    const items = combined.map((item) => {
      const userId = normalizeUserId(item.userId);
      return {
        ...item,
        userId,
        user: userMap.get(userId) || null
      };
    });

    return res.json({ success: true, community: items });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/dashboard/contacts", async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 100, 500);
    const offset = parseOffset(req.query.offset, 0);
    const contacts = await ContactMessage.find({})
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      contacts: contacts.map((item) => ({
        id: String(item._id),
        firstName: item.firstName,
        lastName: item.lastName,
        email: item.email,
        phone: item.phone,
        message: item.message,
        createdAt: item.createdAt
      }))
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/dashboard/appointments", async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 100, 500);
    const offset = parseOffset(req.query.offset, 0);
    const appointments = await Appointment.find({})
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const userMap = await buildUserMap(appointments.map((item) => item.userId));

    return res.json({
      success: true,
      appointments: appointments.map((item) => {
        const userId = normalizeUserId(item.userId);
        return {
          id: String(item._id),
          userId,
          user: userMap.get(userId) || null,
          consultantName: item.consultantName || "",
          consultantRole: item.consultantRole || "",
          sessionType: item.appointmentType || "",
          date: item.appointmentDate,
          time: item.appointmentTime,
          createdAt: item.createdAt
        };
      })
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
