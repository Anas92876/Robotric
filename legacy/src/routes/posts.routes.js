const router = require("express").Router();
const { protect, restrictTo } = require("../middleware/auth");
const {
  listPublished,
  getPost,
  getPostBySlug,
  createPost,
  updatePost,
  deletePost,
} = require("../controllers/posts.controller");

router.get("/", listPublished);

// Slug lookup route must come before :id route to avoid conflicts
router.get("/slug/:slug", getPostBySlug);

router.get("/:id", getPost);

router.post(
  "/",
  protect,
  restrictTo("editor", "admin", "superadmin", "reception", "social"),
  createPost
);

router.put(
  "/:id",
  protect,
  restrictTo("editor", "admin", "superadmin", "reception", "social"),
  updatePost
);

router.delete(
  "/:id",
  protect,
  restrictTo("editor", "admin", "superadmin", "reception", "social"),
  deletePost
);

module.exports = router;
