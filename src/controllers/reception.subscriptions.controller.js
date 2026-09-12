/**
 * Reception Subscriptions Controller
 * 
 * Handles reception operations for subscription session management
 * Reception role can approve/decline requests and create reports
 */

const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError, ValidationError } = require('../utils/errors');
const SessionRequest = require('../models/SessionRequest');
const SessionReport = require('../models/SessionReport');
const UserSubscription = require('../models/UserSubscription');
const { deductHours } = require('../services/subscriptionHours.service');
const supabase = require('../config/supabase');

/**
 * Get all session requests (reception view)
 * GET /api/reception/session-requests
 */
exports.getAllSessionRequests = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const query = {};
  if (status && ['pending', 'approved', 'declined', 'canceled', 'completed', 'no_show'].includes(status)) {
    query.status = status;
  }

  const sessionRequests = await SessionRequest.find(query)
    .populate('userId', 'name email')
    .populate('subscriptionId', 'planId remainingHours')
    .populate('approvedBy', 'name email')
    .populate('declinedBy', 'name email')
    .populate('canceledBy', 'name email')
    .sort({ date: 1, startTime: 1 }); // Sort by date and time

  res.json({
    success: true,
    data: {
      requests: sessionRequests.map(req => ({
        _id: req._id,
        userId: req.userId ? {
          _id: req.userId._id,
          name: req.userId.name,
          email: req.userId.email
        } : null,
        date: req.date,
        startTime: req.startTime,
        durationHours: req.durationHours,
        description: req.description,
        status: req.status,
        createdAt: req.createdAt,
        approvedAt: req.approvedAt,
        approvedBy: req.approvedBy ? {
          _id: req.approvedBy._id,
          name: req.approvedBy.name
        } : null,
        declinedAt: req.declinedAt,
        declinedBy: req.declinedBy ? {
          _id: req.declinedBy._id,
          name: req.declinedBy.name
        } : null,
        declineReason: req.declineReason,
        canceledAt: req.canceledAt,
        completedAt: req.completedAt
      }))
    }
  });
});

/**
 * Approve a session request
 * POST /api/reception/session-requests/:id/approve
 * 
 * On approval:
 * - Update request status to 'approved'
 * - NO hours are deducted at this point
 * - Hours are deducted ONLY when SessionReport is created
 */
exports.approveSessionRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const receptionId = req.user._id || req.user.id;

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
  // Note: Hours are NOT deducted here. They are deducted only when SessionReport is created.
  sessionRequest.status = 'approved';
  sessionRequest.approvedAt = new Date();
  sessionRequest.approvedBy = receptionId;
  await sessionRequest.save();

  // TODO: Future implementation
  // - Send notification to user
  // - Calendar integration (when implemented)

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
 * Decline a session request
 * POST /api/reception/session-requests/:id/decline
 */
exports.declineSessionRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const receptionId = req.user._id || req.user.id;

  const sessionRequest = await SessionRequest.findById(id);

  if (!sessionRequest) {
    throw new NotFoundError('Session request');
  }

  if (sessionRequest.status !== 'pending') {
    throw new BadRequestError(
      `Cannot decline request with status: ${sessionRequest.status}`,
      'INVALID_STATUS'
    );
  }

  // Update request status
  sessionRequest.status = 'declined';
  sessionRequest.declinedAt = new Date();
  sessionRequest.declinedBy = receptionId;
  if (reason) {
    sessionRequest.declineReason = reason.trim();
  }
  await sessionRequest.save();

  // TODO: Future implementation
  // - Send notification to user about decline

  res.json({
    success: true,
    message: 'Session request declined successfully',
    data: {
      _id: sessionRequest._id,
      status: sessionRequest.status,
      declinedAt: sessionRequest.declinedAt,
      declineReason: sessionRequest.declineReason
    }
  });
});

/**
 * Create session report
 * POST /api/reception/session-requests/:id/report
 * 
 * Creates a report for a completed session
 * - Attendance is mandatory (true or false)
 * - PDF is optional (Supabase URL)
 * - Hours are deducted regardless of attendance (already reserved on approval)
 */
exports.createSessionReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes, attendance } = req.body;
  const receptionId = req.user._id || req.user.id;

  // Validation
  if (!notes || !notes.trim()) {
    throw new ValidationError('Notes are required');
  }

  if (attendance === undefined || attendance === null) {
    throw new ValidationError('Attendance is required');
  }

  // Parse attendance (comes as string "true"/"false" from form data)
  const attendanceBool = attendance === 'true' || attendance === true;

  if (typeof attendanceBool !== 'boolean') {
    throw new ValidationError('Attendance must be true or false');
  }

  const sessionRequest = await SessionRequest.findById(id)
    .populate('subscriptionId');

  if (!sessionRequest) {
    throw new NotFoundError('Session request');
  }

  // Check if session is approved (can only report on approved sessions)
  if (sessionRequest.status !== 'approved') {
    throw new BadRequestError(
      `Cannot create report for session with status: ${sessionRequest.status}. Session must be approved.`,
      'INVALID_STATUS'
    );
  }

  // Check if report already exists
  const existingReport = await SessionReport.findOne({ sessionRequestId: id });
  if (existingReport) {
    throw new BadRequestError(
      'Report already exists for this session',
      'REPORT_EXISTS'
    );
  }

  // CRITICAL: This is the ONLY point where hours are deducted
  // Deduct hours for both attended (true) and no-show (false)
  await deductHours(sessionRequest.subscriptionId._id, sessionRequest.durationHours);

  // Handle PDF upload to Supabase if provided
  let pdfUrl = null;
  if (req.file) {
    try {
      // Check if Supabase is configured
      if (!supabase) {
        throw new Error('File storage is not configured');
      }

      // Generate storage path
      const timestamp = Date.now();
      const sanitizedFilename = req.file.originalname
        .replace(/[^a-zA-Z0-9.-]/g, '-')
        .toLowerCase()
        .substring(0, 100);
      const storagePath = `session-reports/${id}/${timestamp}-${sanitizedFilename}`;

      // Upload to Supabase
      const bucket = process.env.SUPABASE_BUCKET || 'resources';
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storagePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw new Error('Failed to upload PDF to storage');
      }

      // Store the storage path (we'll generate signed URLs when accessing)
      pdfUrl = storagePath;
    } catch (error) {
      console.error('Error uploading PDF:', error);
      // Continue without PDF - don't fail the entire report creation
      // You can throw an error here if PDF upload is critical
    }
  }

  // Create report
  const report = await SessionReport.create({
    sessionRequestId: id,
    createdBy: receptionId,
    notes: notes.trim(),
    pdfUrl: pdfUrl,
    attendance: attendanceBool
  });

  // Update session request status based on attendance
  // Status can only be changed to 'completed' or 'no_show' through report creation
  sessionRequest.status = attendanceBool ? 'completed' : 'no_show';
  sessionRequest.completedAt = new Date();
  await sessionRequest.save();

  // TODO: Future - Track actual hours vs requested hours for analytics

  res.status(201).json({
    success: true,
    message: 'Session report created successfully',
    data: {
      _id: report._id,
      sessionRequestId: report.sessionRequestId,
      notes: report.notes,
      pdfUrl: report.pdfUrl,
      attendance: report.attendance,
      createdAt: report.createdAt
    }
  });
});

/**
 * Get all session reports created by current reception user
 * GET /api/reception/session-reports
 */
exports.getAllSessionReports = asyncHandler(async (req, res) => {
  const receptionId = req.user._id || req.user.id;

  const reports = await SessionReport.find({ createdBy: receptionId })
    .populate({
      path: 'sessionRequestId',
      select: 'date startTime durationHours description status userId',
      populate: {
        path: 'userId',
        select: 'name email'
      }
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
            status: sessionRequest.status,
            userId: sessionRequest.userId ? {
              _id: sessionRequest.userId._id,
              name: sessionRequest.userId.name,
              email: sessionRequest.userId.email
            } : null
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
