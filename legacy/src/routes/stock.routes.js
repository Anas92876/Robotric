const router = require("express").Router();
const { protect, restrictTo } = require("../middleware/auth");
const {
  getLevels,
  getStats,
  getCategories,
  getRecent,
  getHistory,
  adjust,
} = require("../controllers/stock.controller");

// Get all stock levels
router.get("/levels", protect, getLevels);

// Get dashboard statistics
router.get("/stats", protect, getStats);

// Get category breakdown
router.get("/categories", protect, getCategories);

// Get recent movements
router.get("/recent-movements", protect, getRecent);

// Get movement history
router.get("/history", protect, getHistory);

// Adjust stock levels (restricted to admin and superadmin)
router.post("/adjust", protect, restrictTo("admin", "superadmin"), adjust);

module.exports = router;
