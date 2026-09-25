const Joi = require("joi");
const Post = require("../models/Post");
const asyncHandler = require("../utils/asyncHandler");
const { NotFoundError, ValidationError } = require("../utils/errors");
const logger = require("../utils/logger");

/**
 * List all published posts
 * GET /api/posts
 */
const listPublished = asyncHandler(async (req, res) => {
  logger.logDB('find', 'Post', { status: 'published' });

  const posts = await Post.find({ status: "published" })
    .sort({ publishedAt: -1 })
    .lean();

  logger.info(`Listed ${posts.length} published posts`);
  res.json(posts);
});

/**
 * Get a single post by ID (only published posts for public access)
 * GET /api/posts/:id
 */
const getPost = asyncHandler(async (req, res) => {
  logger.logDB('findById', 'Post', { id: req.params.id });

  const post = await Post.findOne({ 
    _id: req.params.id, 
    status: 'published' 
  }).lean();

  if (!post) {
    throw new NotFoundError('Post');
  }

  res.json(post);
});

/**
 * Get a single post by slug (only published posts)
 * GET /api/posts/slug/:slug
 */
const getPostBySlug = asyncHandler(async (req, res) => {
  logger.logDB('findOne', 'Post', { slug: req.params.slug, status: 'published' });

  const post = await Post.findOne({ 
    slug: req.params.slug, 
    status: 'published' 
  }).lean();

  if (!post) {
    throw new NotFoundError('Post');
  }

  res.json(post);
});

const createSchema = Joi.object({
  slug: Joi.string().required(),
  title: Joi.string().required(),
  body: Joi.string().required(),
  tags: Joi.array().items(Joi.string()).default([]),
  status: Joi.string().valid("draft", "published").default("draft"),
});

/**
 * Create a new post
 * POST /api/posts
 */
const createPost = asyncHandler(async (req, res) => {
  const { error, value } = createSchema.validate(req.body);

  if (error) {
    throw new ValidationError(error.message);
  }

  logger.logDB('create', 'Post', { title: value.title, authorId: req.user.id });

  const post = await Post.create({
    ...value,
    authorId: req.user.id,
    publishedAt: value.status === "published" ? new Date() : undefined,
  });

  logger.info(`Created post: ${post.title} (${post._id}) by user ${req.user.id}`);
  res.status(201).json(post);
});

const updateSchema = Joi.object({
  title: Joi.string(),
  body: Joi.string(),
  tags: Joi.array().items(Joi.string()),
  status: Joi.string().valid("draft", "published"),
});

/**
 * Update a post
 * PUT /api/posts/:id
 */
const updatePost = asyncHandler(async (req, res) => {
  const { error, value } = updateSchema.validate(req.body);

  if (error) {
    throw new ValidationError(error.message);
  }

  logger.logDB('findByIdAndUpdate', 'Post', { id: req.params.id });

  const post = await Post.findByIdAndUpdate(
    req.params.id,
    {
      ...value,
      publishedAt: value.status === "published" ? new Date() : undefined,
    },
    { new: true, runValidators: true }
  );

  if (!post) {
    throw new NotFoundError('Post');
  }

  logger.info(`Updated post: ${post.title} (${post._id})`);
  res.json(post);
});

/**
 * Delete a post
 * DELETE /api/posts/:id
 */
const deletePost = asyncHandler(async (req, res) => {
  logger.logDB('findByIdAndDelete', 'Post', { id: req.params.id });

  const post = await Post.findByIdAndDelete(req.params.id);

  if (!post) {
    throw new NotFoundError('Post');
  }

  logger.info(`Deleted post: ${post.title} (${post._id})`);
  res.json({ success: true, message: 'Post deleted successfully' });
});

module.exports = {
  listPublished,
  getPost,
  getPostBySlug,
  createPost,
  updatePost,
  deletePost,
};
