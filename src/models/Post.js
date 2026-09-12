const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    tags: { type: [String], default: [], index: true }, // Index for tag-based queries
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Index for author-based queries
    },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    publishedAt: { type: Date, index: true },
  },
  { timestamps: true }
);

// Compound index for published posts ordered by date (most common query)
postSchema.index({ status: 1, publishedAt: -1 });

// Index for author's posts
postSchema.index({ authorId: 1, status: 1 });

module.exports = mongoose.model("Post", postSchema);
