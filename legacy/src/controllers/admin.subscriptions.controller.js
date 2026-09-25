/**
 * Admin Subscriptions Controller
 * 
 * Handles admin operations for subscription management
 */

const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const SessionRequest = require('../models/SessionRequest');
const UserSubscription = require('../models/UserSubscription');

/**
 * Get all session requests (admin view)
 * GET /api/admin/session-requests
 */
exports.getAllSessionRequests = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const query = {};
  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    query.status = status;
  }

  const sessionRequests = await SessionRequest.find(query)
    .populate('userId', 'name email')
    .populate('subscriptionId', 'planId remainingHours')
    .populate('approvedBy', 'name email')
    .populate('rejectedBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: {
      requests: sessionRequests.map(req => ({
        _id: req._id,
        user: {
          _id: req.userId._id,
          name: req.userId.name,
          email: req.userId.email
        },
        requestedHours: req.requestedHours,
        topic: req.topic,
        description: req.description,
        status: req.status,
        createdAt: req.createdAt,
        approvedAt: req.approvedAt,
        approvedBy: req.approvedBy ? {
          _id: req.approvedBy._id,
          name: req.approvedBy.name
        } : null,
        rejectedAt: req.rejectedAt,
        rejectedBy: req.rejectedBy ? {
          _id: req.rejectedBy._id,
          name: req.rejectedBy.name
        } : null,
        rejectionReason: req.rejectionReason
      }))
    }
  });
});

/**
 * Approve a session request
 * POST /api/admin/session-requests/:id/approve
 */
exports.approveSessionRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = req.user._id || req.user.id;

  const sessionRequest = await SessionRequest.findById(id)
    .populate('subscriptionId');

  if (!sessionRequest) {
    throw new NotFoundError('Session request');
  }

  if (sessionRequest.status !== 'pending') {
    throw new BadRequestError(
      `Cannot approve request with status: ${sessionRequest.status}`,
      'INVALID_STATUS'
    );
  }

  // Update request status
  sessionRequest.status = 'approved';
  sessionRequest.approvedAt = new Date();
  sessionRequest.approvedBy = adminId;
  await sessionRequest.save();

  // TODO: Future implementation
  // - Deduct hours from subscription: subscription.remainingHours -= sessionRequest.requestedHours
  // - Assign trainer (when trainer system is implemented)
  // - Schedule session (when calendar system is implemented)
  // - Send notification to user

  res.json({
    success: true,
    message: 'Session request approved successfully',
    data: {
      _id: sessionRequest._id,
      status: sessionRequest.status,
      approvedAt: sessionRequest.approvedAt
    }
  });
});

/**
 * Reject a session request
 * POST /api/admin/session-requests/:id/reject
 */
exports.rejectSessionRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const adminId = req.user._id || req.user.id;

  const sessionRequest = await SessionRequest.findById(id);

  if (!sessionRequest) {
    throw new NotFoundError('Session request');
  }

  if (sessionRequest.status !== 'pending') {
    throw new BadRequestError(
      `Cannot reject request with status: ${sessionRequest.status}`,
      'INVALID_STATUS'
    );
  }

  // Update request status
  sessionRequest.status = 'rejected';
  sessionRequest.rejectedAt = new Date();
  sessionRequest.rejectedBy = adminId;
  if (reason) {
    sessionRequest.rejectionReason = reason.trim();
  }
  await sessionRequest.save();

  // TODO: Future implementation
  // - Send notification to user about rejection

  res.json({
    success: true,
    message: 'Session request rejected successfully',
    data: {
      _id: sessionRequest._id,
      status: sessionRequest.status,
      rejectedAt: sessionRequest.rejectedAt,
      rejectionReason: sessionRequest.rejectionReason
    }
  });
});
