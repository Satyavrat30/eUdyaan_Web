const express = require("express");
const CommunityPost = require("../models/CommunityPost");

const router = express.Router();

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

function mapPost(doc) {
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
    category: detectCategory(doc)
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
    let posts = docs.map(mapPost);

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

router.post("/posts", async (req, res) => {
  try {
    const { anonymousId, title, content, tags = [], mediaName = "" } = req.body;

    if (!anonymousId || !title || !content) {
      return res.status(400).json({ error: "anonymousId, title, and content are required" });
    }

    const cleanedTags = Array.isArray(tags)
      ? tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 5)
      : [];

    const post = await CommunityPost.create({
      anonymousId: String(anonymousId).trim(),
      title: String(title).trim(),
      content: String(content).trim(),
      tags: cleanedTags,
      mediaName: String(mediaName || "").trim()
    });

    return res.status(201).json({ success: true, post: mapPost(post.toObject()) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/posts/:postId/replies", async (req, res) => {
  try {
    const { postId } = req.params;
    const { anonymousId, content, parentReplyId = null } = req.body;

    if (!anonymousId || !content) {
      return res.status(400).json({ error: "anonymousId and content are required" });
    }

    const post = await CommunityPost.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const newReply = {
      anonymousId: String(anonymousId).trim(),
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

router.post("/posts/:postId/like", async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await CommunityPost.findByIdAndUpdate(
      postId,
      { $inc: { likes: 1 } },
      { new: true }
    );
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    return res.json({ success: true, likes: post.likes });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
