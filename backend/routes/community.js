const express = require("express");
const CommunityPost = require("../models/CommunityPost");
const User = require("../models/User");

const router = express.Router();

const actionWindowMs = 60 * 1000;
const actionMaxRequests = 12;
const actionBuckets = new Map();
const actionMaxKeys = 5000;
let actionLastCleanupAt = 0;

function getClientKey(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : (typeof forwarded === "string" ? forwarded.split(",")[0] : req.ip);
  return String(ip || "unknown").trim();
}

function postActionLimiter(req, res, next) {
  const key = getClientKey(req);
  const now = Date.now();

  if (now - actionLastCleanupAt > actionWindowMs) {
    actionLastCleanupAt = now;
    for (const [bucketKey, bucket] of actionBuckets.entries()) {
      if (now >= bucket.resetAt) {
        actionBuckets.delete(bucketKey);
      }
    }
  }

  if (!actionBuckets.has(key) && actionBuckets.size >= actionMaxKeys) {
    return res.status(503).json({ error: "Server is busy. Please try again shortly." });
  }

  const current = actionBuckets.get(key);

  if (!current || now >= current.resetAt) {
    actionBuckets.set(key, { count: 1, resetAt: now + actionWindowMs });
    return next();
  }

  current.count += 1;
  if (current.count > actionMaxRequests) {
    const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
    res.setHeader("Retry-After", String(Math.max(retryAfterSeconds, 1)));
    return res.status(429).json({ error: "Too many requests. Please try again shortly." });
  }

  return next();
}

async function requireAuthenticatedUser(req, res, next) {
  try {
    const userId = String(req.body?.userId || "").trim();
    if (!/^[a-fA-F0-9]{24}$/.test(userId)) {
      return res.status(401).json({ error: "Login required" });
    }

    const user = await User.findById(userId, { _id: 1 }).lean();
    if (!user?._id) {
      return res.status(401).json({ error: "Login required" });
    }

    req.authUserId = String(user._id);
    return next();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

function makeAnonymousId(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const code = String(hash % 1000000).padStart(6, "0");
  return `ANON-${code}`;
}

function makeGuestAnonymousId(req) {
  const fingerprint = `${getClientKey(req)}|${req.headers["user-agent"] || "ua"}`;
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i += 1) {
    hash = (hash * 37 + fingerprint.charCodeAt(i)) >>> 0;
  }
  return `Guest_${String(hash % 10000).padStart(4, "0")}`;
}

function normalizeLegacyAnonymousId(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  if (!/^[A-Za-z0-9_-]{3,40}$/.test(normalized)) return "";
  return normalized;
}

async function resolveAnonymousId(userId, req, anonymousId) {
  if (!userId) {
    const legacy = normalizeLegacyAnonymousId(anonymousId);
    return legacy || makeGuestAnonymousId(req);
  }
  const userIdValue = String(userId).trim();
  if (!/^[a-fA-F0-9]{24}$/.test(userIdValue)) {
    const legacy = normalizeLegacyAnonymousId(anonymousId);
    return legacy || makeGuestAnonymousId(req);
  }
  const user = await User.findById(userIdValue, { _id: 1 }).lean();
  if (!user?._id) {
    const legacy = normalizeLegacyAnonymousId(anonymousId);
    return legacy || makeGuestAnonymousId(req);
  }
  return makeAnonymousId(String(user._id));
}

function countReplies(replies = []) {
  let count = 0;
  replies.forEach((reply) => {
    count += 1 + countReplies(reply.replies || []);
  });
  return count;
}

function detectCategory(post) {
  const text = `${post.title} ${post.content} ${(post.tags || []).join(" ")}`.toLowerCase();
  if (/anxiety|panic|nervous|overthink/.test(text)) return "anxiety";
  if (/depress|hopeless|low mood/.test(text)) return "depression";
  if (/relationship|breakup|partner/.test(text)) return "relationship";
  if (/exam|study|grade|placement|attendance/.test(text)) return "academics";
  if (/sleep|insomnia|night/.test(text)) return "sleep";
  return "other";
}

function getUserVoteFromPost(doc, voterKey) {
  if (!voterKey) return 0;
  if ((doc.upvoterKeys || []).includes(voterKey)) return 1;
  if ((doc.downvoterKeys || []).includes(voterKey)) return -1;
  return 0;
}

function mapPost(doc, voterKey = "") {
  return {
    id: String(doc._id),
    anonymousId: doc.anonymousId,
    title: doc.title,
    content: doc.content,
    createdAt: doc.createdAt,
    likes: doc.likes || 0,
    tags: doc.tags || [],
    mediaName: doc.mediaName || "",
    replies: doc.replies || [],
    replyCount: countReplies(doc.replies || []),
    category: detectCategory(doc),
    userVote: getUserVoteFromPost(doc, voterKey)
  };
}

function addReplyToTree(replies, parentReplyId, newReply) {
  for (const reply of replies) {
    if (String(reply._id) === parentReplyId) {
      reply.replies.push(newReply);
      return true;
    }
    if (addReplyToTree(reply.replies || [], parentReplyId, newReply)) {
      return true;
    }
  }
  return false;
}

router.get("/posts", async (req, res) => {
  try {
    const { sort = "recent", category = "all", days = "all", tag = "all" } = req.query;
    const userId = req.query?.userId;
    const anonymousId = req.query?.anonymousId;
    const viewerAnonymousId = await resolveAnonymousId(userId, req, anonymousId);
    const voterKey = userId && /^[a-fA-F0-9]{24}$/.test(String(userId).trim())
      ? `user:${String(userId).trim()}`
      : `anon:${String(viewerAnonymousId).trim()}`;
    const query = {};

    if (tag !== "all") {
      query.tags = String(tag).toLowerCase();
    }

    if (days !== "all") {
      const n = Number(days);
      if (!Number.isNaN(n) && n > 0) {
        const threshold = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
        query.createdAt = { $gte: threshold };
      }
    }

    const dbSort = sort === "popular" ? { likes: -1, createdAt: -1 } : { createdAt: -1 };
    const docs = await CommunityPost.find(query).sort(dbSort).lean();
    let posts = docs.map((doc) => mapPost(doc, voterKey));

    if (category !== "all") {
      posts = posts.filter((post) => post.category === category);
    }

    if (sort === "replied") {
      posts.sort((a, b) => b.replyCount - a.replyCount);
    }

    return res.json({ success: true, posts });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/posts", requireAuthenticatedUser, postActionLimiter, async (req, res) => {
  try {
    const { anonymousId, title, content, tags = [], mediaName = "" } = req.body;
    const userId = req.authUserId;

    const cleanedTags = Array.isArray(tags)
      ? tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 5)
      : [];

    const resolvedAnonymousId = await resolveAnonymousId(userId, req, anonymousId);
    const creatorVoterKey = userId && /^[a-fA-F0-9]{24}$/.test(String(userId).trim())
      ? `user:${String(userId).trim()}`
      : `anon:${String(resolvedAnonymousId).trim()}`;

    if (!resolvedAnonymousId || !title || !content || !cleanedTags.length) {
      return res.status(400).json({ error: "title, content, and at least one tag are required" });
    }

    const post = await CommunityPost.create({
      anonymousId: String(resolvedAnonymousId).trim(),
      title: String(title).trim(),
      content: String(content).trim(),
      tags: cleanedTags,
      mediaName: String(mediaName || "").trim(),
      likes: 1,
      upvoterKeys: [creatorVoterKey]
    });

    return res.status(201).json({ success: true, post: mapPost(post.toObject()) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/posts/:postId/replies", requireAuthenticatedUser, postActionLimiter, async (req, res) => {
  try {
    const { postId } = req.params;
    const { anonymousId, content, parentReplyId = null } = req.body;
    const userId = req.authUserId;

    const resolvedAnonymousId = await resolveAnonymousId(userId, req, anonymousId);

    if (!resolvedAnonymousId || !content) {
      return res.status(400).json({ error: "content is required" });
    }

    const post = await CommunityPost.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const newReply = {
      anonymousId: String(resolvedAnonymousId).trim(),
      content: String(content).trim(),
      replies: []
    };

    if (!parentReplyId) {
      post.replies.push(newReply);
    } else {
      const ok = addReplyToTree(post.replies, String(parentReplyId), newReply);
      if (!ok) {
        return res.status(404).json({ error: "Parent reply not found" });
      }
    }

    await post.save();
    return res.json({ success: true, post: mapPost(post.toObject()) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

async function votePostById(req, res) {
  try {
    const { postId } = req.params;
    const { anonymousId, direction } = req.body || {};
    const userId = req.authUserId || "";
    const voteDirection = String(direction || "").toLowerCase();
    if (!["up", "down"].includes(voteDirection)) {
      return res.status(400).json({ error: "direction must be 'up' or 'down'" });
    }

    const resolvedAnonymousId = await resolveAnonymousId(userId, req, anonymousId);
    const voterKey = userId && /^[a-fA-F0-9]{24}$/.test(String(userId).trim())
      ? `user:${String(userId).trim()}`
      : `anon:${String(resolvedAnonymousId).trim()}`;

    const post = await CommunityPost.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const upvoters = new Set((post.upvoterKeys || []).map(String));
    const downvoters = new Set((post.downvoterKeys || []).map(String));

    const currentVote = upvoters.has(voterKey) ? 1 : (downvoters.has(voterKey) ? -1 : 0);
    let nextVote = currentVote;

    if (voteDirection === "up") {
      if (currentVote === 1) {
        upvoters.delete(voterKey);
        post.likes -= 1;
        nextVote = 0;
      } else if (currentVote === 0) {
        upvoters.add(voterKey);
        post.likes += 1;
        nextVote = 1;
      } else {
        downvoters.delete(voterKey);
        upvoters.add(voterKey);
        post.likes += 2;
        nextVote = 1;
      }
    } else {
      if (currentVote === -1) {
        downvoters.delete(voterKey);
        post.likes += 1;
        nextVote = 0;
      } else if (currentVote === 0) {
        downvoters.add(voterKey);
        post.likes -= 1;
        nextVote = -1;
      } else {
        upvoters.delete(voterKey);
        downvoters.add(voterKey);
        post.likes -= 2;
        nextVote = -1;
      }
    }

    post.upvoterKeys = Array.from(upvoters);
    post.downvoterKeys = Array.from(downvoters);
    await post.save();

    return res.json({
      success: true,
      likes: post.likes,
      upvotes: post.likes,
      userVote: nextVote
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

router.post("/posts/:postId/vote", requireAuthenticatedUser, votePostById);
router.post("/posts/:postId/upvote", (req, res) => {
  req.body = { ...(req.body || {}), direction: "up" };
  return requireAuthenticatedUser(req, res, () => votePostById(req, res));
});
router.post("/posts/:postId/downvote", (req, res) => {
  req.body = { ...(req.body || {}), direction: "down" };
  return requireAuthenticatedUser(req, res, () => votePostById(req, res));
});
router.post("/posts/:postId/like", (req, res) => {
  req.body = { ...(req.body || {}), direction: "up" };
  return requireAuthenticatedUser(req, res, () => votePostById(req, res));
});

module.exports = router;
