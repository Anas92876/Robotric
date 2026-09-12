/**
 * Student Subscriptions Controller
 * 
 * Handles student subscription-related operations
 */

const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError, ValidationError, ForbiddenError } = require('../utils/errors');
const UserSubscription = require('../models/UserSubscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const SessionRequest = require('../models/SessionRequest');
const SessionReport = require('../models/SessionReport');
const { validateSessionTime } = require('../services/sessionValidation.service');

/**
 * Get current user's subscription status
 * GET /api/subscriptions/me
 */
exports.getMySubscription = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const now = new Date();

  // Find active subscription
  const subscription = await UserSubscription.findOne({
    userId,
    status: 'active',
    startsAt: { $lte: now },
    endsAt: { $gt: now }
  })
    .populate('planId', 'name monthlyHours price')
    .sort({ createdAt: -1 });

  if (!subscription) {
    return res.json({
      success: true,
      data: {
        hasActiveSubscription: false,
        subscription: null
      }
    });
  }

  res.json({
    success: true,
    data: {
      hasActiveSubscription: true,
      subscription: {
        _id: subscription._id,
        plan: {
          _id: subscription.planId._id,
          name: subscription.planId.name,
          monthlyHours: subscription.planId.monthlyHours,
          price: subscription.planId.price
        },
        startsAt: subscription.startsAt,
        endsAt: subscription.endsAt,
        remainingHours: subscription.remainingHours,
        status: subscription.status
      }
    }
  });
});

/**
 * Create a new session request
 * POST /api/subscriptions/session-requests
 */
exports.createSessionRequest = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const { date, startTime, durationHours, description } = req.body;

  // Validation
  if (!date || !startTime || !durationHours) {
    throw new ValidationError('Date, start time, and duration are required');
  }

  if (durationHours <= 0) {
    throw new ValidationError('Duration must be greater than 0');
  }

  // Parse and validate date
  const sessionDate = new Date(date);
  if (isNaN(sessionDate.getTime())) {
    throw new ValidationError('Invalid date format');
  }

  // Get active subscription (middleware ensures it exists, but double-check)
  const now = new Date();
  const subscription = await UserSubscription.findOne({
    userId,
    status: 'active',
    startsAt: { $lte: now },
    endsAt: { $gt: now }
  });

  if (!subscription) {
    throw new ForbiddenError(
      'Active subscription required to create session request',
      'SUBSCRIPTION_REQUIRED'
    );
  }

  // Check if user has enough remaining hours
  if (subscription.remainingHours < durationHours) {
    throw new BadRequestError(
      `Insufficient hours. Available: ${subscription.remainingHours}, Requested: ${durationHours}`,
      'INSUFFICIENT_HOURS'
    );
  }

  // Validate time window and check for overlaps
  await validateSessionTime(userId, sessionDate, startTime, durationHours);

  // Create session request
  const sessionRequest = await SessionRequest.create({
    userId,
    subscriptionId: subscription._id,
    date: sessionDate,
    startTime: startTime.trim(),
    durationHours,
    description: description ? description.trim() : undefined,
    status: 'pending'
  });

  // Populate for response
  await sessionRequest.populate('subscriptionId', 'planId remainingHours');

  res.status(201).json({
    success: true,
    message: 'Session request created successfully',
    data: {
      _id: sessionRequest._id,
      date: sessionRequest.date,
      startTime: sessionRequest.startTime,
      durationHours: sessionRequest.durationHours,
      description: sessionRequest.description,
      status: sessionRequest.status,
      createdAt: sessionRequest.createdAt
    }
  });
});

/**
 * Get current user's session requests
 * GET /api/subscriptions/my-requests
 */
exports.getMySessionRequests = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;

  const sessionRequests = await SessionRequest.find({ userId })
    .populate('subscriptionId', 'planId')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: {
      requests: sessionRequests.map(req => ({
        _id: req._id,
        date: req.date,
        startTime: req.startTime,
        durationHours: req.durationHours,
        description: req.description,
        status: req.status,
        createdAt: req.createdAt,
        approvedAt: req.approvedAt,
        declinedAt: req.declinedAt,
        declineReason: req.declineReason,
        canceledAt: req.canceledAt,
        completedAt: req.completedAt
      }))
    }
  });
});

/**
 * Cancel a session request
 * POST /api/subscriptions/session-requests/:id/cancel
 * 
 * Rules:
 * - Can only cancel if session date is AFTER today
 * - Same-day cancellation is NOT allowed
 * - If approved, restore hours to subscription
 */
exports.cancelSessionRequest = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const { id } = req.params;

  const sessionRequest = await SessionRequest.findById(id)
    .populate('subscriptionId');

  if (!sessionRequest) {
    throw new NotFoundError('Session request');
  }

  // Verify ownership
  if (sessionRequest.userId.toString() !== userId.toString()) {
    throw new ForbiddenError('You can only cancel your own session requests', 'FORBIDDEN');
  }

  // Check if already canceled or completed
  if (['canceled', 'completed', 'no_show'].includes(sessionRequest.status)) {
    throw new BadRequestError(
      `Cannot cancel session with status: ${sessionRequest.status}`,
      'INVALID_STATUS'
    );
  }

  // Check cancellation policy: can only cancel if date is AFTER today (date-only comparison)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const sessionDate = new Date(sessionRequest.date);
  sessionDate.setHours(0, 0, 0, 0);

  if (sessionDate <= today) {
    throw new BadRequestError(
      'Cannot cancel session on the same day or in the past. Cancellation must be done before the session date.',
      'CANCELLATION_NOT_ALLOWED'
    );
  }

  // Update request status
  // Note: No hours are restored because hours are only deducted when SessionReport is created
  // If session was never reported, no hours were deducted, so nothing to restore
  sessionRequest.status = 'canceled';
  sessionRequest.canceledAt = new Date();
  sessionRequest.canceledBy = userId;
  await sessionRequest.save();

  res.json({
    success: true,
    message: 'Session request canceled successfully',
    data: {
      _id: sessionRequest._id,
      status: sessionRequest.status,
      canceledAt: sessionRequest.canceledAt
    }
  });
});

/**
 * Get session report for a specific session request
 * GET /api/subscriptions/session-requests/:id/report
 */
exports.getSessionReport = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const { id } = req.params;

  // First verify the session request belongs to the user
  const sessionRequest = await SessionRequest.findById(id);
  
  if (!sessionRequest) {
    throw new NotFoundError('Session request');
  }

  // Verify ownership
  if (sessionRequest.userId.toString() !== userId.toString()) {
    throw new ForbiddenError('You can only view reports for your own sessions', 'FORBIDDEN');
  }

  // Get the report for this session
  const report = await SessionReport.findOne({ sessionRequestId: id })
    .populate('createdBy', 'name email');

  if (!report) {
    throw new NotFoundError('Session report');
  }

  res.json({
    success: true,
    data: {
      _id: report._id,
      sessionRequestId: report.sessionRequestId,
      sessionRequest: {
        _id: sessionRequest._id,
        date: sessionRequest.date,
        startTime: sessionRequest.startTime,
        durationHours: sessionRequest.durationHours,
        description: sessionRequest.description,
        status: sessionRequest.status
      },
      notes: report.notes,
      pdfUrl: report.pdfUrl,
      attendance: report.attendance,
      createdBy: report.createdBy ? {
        _id: report.createdBy._id,
        name: report.createdBy.name,
        email: report.createdBy.email
      } : null,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt
    }
  });
});

/**
 * Get all session reports for current user's sessions
 * GET /api/subscriptions/my-reports
 */
exports.getMySessionReports = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;

  // Get all session requests for this user
  const sessionRequests = await SessionRequest.find({ userId }).select('_id');
  const sessionRequestIds = sessionRequests.map(sr => sr._id);

  // Get all reports for these session requests
  const reports = await SessionReport.find({ 
    sessionRequestId: { $in: sessionRequestIds } 
  })
    .populate({
      path: 'sessionRequestId',
      select: 'date startTime durationHours description status',
    })
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: {
      reports: reports.map(report => {
        const sessionRequest = report.sessionRequestId;
        return {
          _id: report._id,
          sessionRequestId: sessionRequest ? sessionRequest._id : null,
          sessionRequest: sessionRequest ? {
            _id: sessionRequest._id,
            date: sessionRequest.date,
            startTime: sessionRequest.startTime,
            durationHours: sessionRequest.durationHours,
            description: sessionRequest.description,
            status: sessionRequest.status
          } : null,
          notes: report.notes,
          pdfUrl: report.pdfUrl,
          attendance: report.attendance,
          createdBy: report.createdBy ? {
            _id: report.createdBy._id,
            name: report.createdBy.name,
            email: report.createdBy.email
          } : null,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt
        };
      })
    }
  });
});
