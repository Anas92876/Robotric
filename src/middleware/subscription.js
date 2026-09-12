/**
 * Subscription Middleware
 * 
 * Middleware to check if user has an active subscription
 * Grants access based on subscription status
 */

const UserSubscription = require('../models/UserSubscription');
const { ForbiddenError } = require('../utils/errors');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Require active subscription middleware
 * 
 * Checks if user has an active, non-expired subscription
 * Rejects with 403 if no active subscription found
 * 
 * Usage:
 *   router.post('/session-requests', protect, requireActiveSubscription, createSessionRequest);
 */
const requireActiveSubscription = asyncHandler(async (req, res, next) => {
  const userId = req.user._id || req.user.id;
  const now = new Date();

  // Find active subscription for user
  const subscription = await UserSubscription.findOne({
    userId,
    status: 'active',
    startsAt: { $lte: now },
    endsAt: { $gt: now }
  }).populate('planId', 'name monthlyHours');

  if (!subscription) {
    throw new ForbiddenError(
      'Active subscription required to access this resource',
      'SUBSCRIPTION_REQUIRED'
    );
  }

  // Attach subscription to request for use in controllers
  req.subscription = subscription;
  next();
});

module.exports = {
  requireActiveSubscription
};
