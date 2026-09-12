const router = require("express").Router();
const { protect } = require("../middleware/auth");
const {
  login,
  logout,
  me,
  requestPasswordChange,
  confirmPasswordChange,
  requestEmailChange,
  confirmEmailChange,
  requestForgotPassword,
  confirmForgotPassword,
} = require("../controllers/auth.controller");

const { authLimiter, strictLimiter } = require("../middleware/rateLimiting");

router.post("/login", authLimiter, login);
router.post("/logout", protect, logout);
router.get("/me", protect, me);

router.post("/change-password/request", protect, strictLimiter, requestPasswordChange);
router.post("/change-password/confirm", protect, strictLimiter, confirmPasswordChange);
router.post("/change-email/request", protect, strictLimiter, requestEmailChange);
router.post("/change-email/confirm", protect, strictLimiter, confirmEmailChange);

// Public forgot-password (no auth required)
router.post("/forgot-password/request", strictLimiter, requestForgotPassword);
router.post("/forgot-password/confirm", strictLimiter, confirmForgotPassword);

module.exports = router;
