/**
 * Admin Subscription Routes
 * 
 * Routes for admin subscription management
 */

const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  getAllSessionRequests,
  approveSessionRequest,
  rejectSessionRequest
} = require('../controllers/admin.subscriptions.controller');

// All routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin', 'superadmin'));

// Get all session requests
router.get('/session-requests', getAllSessionRequests);

// Approve session request
router.post('/session-requests/:id/approve', approveSessionRequest);

// Reject session request
router.post('/session-requests/:id/reject', rejectSessionRequest);

module.exports = router;
