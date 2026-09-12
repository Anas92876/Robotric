/**
 * Notifications Routes
 * 
 * REST API routes for push notification token management
 */

const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  registerToken,
  unregisterToken,
  testNotification,
  cleanupTokens,
  debugTokens
} = require('../controllers/notifications.controller');

// All routes require authentication
router.use(protect);

// Register push token
router.post('/register', registerToken);

// Unregister push token
router.post('/unregister', unregisterToken);

// Test notification
router.post('/test', testNotification);

// Debug: view current user's token info
router.get('/debug', debugTokens);

// Cleanup: remove duplicate/stale tokens (admin/reception only)
router.post('/cleanup', restrictTo('admin', 'superadmin', 'reception'), cleanupTokens);

module.exports = router;
