/**
 * Student Subscription Routes
 * 
 * Routes for student subscription management
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireActiveSubscription } = require('../middleware/subscription');
const {
  getMySubscription,
  createSessionRequest,
  getMySessionRequests,
  cancelSessionRequest,
  getSessionReport,
  getMySessionReports
} = require('../controllers/student.subscriptions.controller');
const { getActiveSubscriptionPlans } = require('../controllers/reception.userSubscriptions.controller');

// All routes require authentication
router.use(protect);

// Get active subscription plans (available to all authenticated users)
router.get('/plans', getActiveSubscriptionPlans);

// Get current user's subscription status
router.get('/me', getMySubscription);

// Get user's session requests (no subscription required to view)
router.get('/my-requests', getMySessionRequests);

// Get all session reports for current user
router.get('/my-reports', getMySessionReports);

// Get session report for a specific session request
router.get('/session-requests/:id/report', getSessionReport);

// Create session request (requires active subscription)
router.post('/session-requests', requireActiveSubscription, createSessionRequest);

// Cancel session request (requires active subscription)
router.post('/session-requests/:id/cancel', requireActiveSubscription, cancelSessionRequest);

module.exports = router;
