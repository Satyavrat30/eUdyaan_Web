const mongoose = require("mongoose");

const replySchema = new mongoose.Schema(
  {
    anonymousId: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true, maxlength: 600 },
    replies: []
  },
  { timestamps: true }
);

replySchema.add({ replies: [replySchema] });

const communityPostSchema = new mongoose.Schema(
  {
    anonymousId: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 90 },
    content: { type: String, required: true, trim: true, maxlength: 1200 },
    tags: {
      type: [{ type: String, trim: true, lowercase: true }],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: "At least one tag is required"
      }
    },
    mediaName: { type: String, default: "" },
    likes: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

communityPostSchema.index({ createdAt: -1 });
communityPostSchema.index({ likes: -1 });
communityPostSchema.index({ tags: 1 });

communityPostSchema.add({ replies: [replySchema] });

module.exports = mongoose.model("CommunityPost", communityPostSchema);
