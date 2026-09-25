const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const Resource = require('../models/Resource');
const ResourceAssignment = require('../models/ResourceAssignment');
const Enrollment = require('../models/Enrollment');
const Group = require('../models/Group');
const Session = require('../models/Session');
const supabase = require('../config/supabase');
const logger = require('../utils/logger');
const mongoose = require('mongoose');
const { generateSecureToken, validateAndConsumeToken, getClientIp } = require('../utils/secureTokens');

// @desc    Get PDF viewer URL (generates signed URL)
// @route   GET /api/student/resources/:resourceId/viewer
// @access  Private (Student, Trainer, CLO, Admin)
exports.getViewerUrl = asyncHandler(async (req, res) => {
  const { resourceId } = req.params;
  const userId = req.user._id;
  const userRole = req.user.role;

  // Check if request is from mobile app
  const isMobile = req.headers['x-platform'] === 'mobile';

  // Check if Supabase is configured
  if (!supabase) {
    throw new AppError('File storage is not configured. Please contact administrator.', 503);
  }

  // Validate resourceId format
  if (!resourceId.match(/^[0-9a-fA-F]{24}$/)) {
    throw new AppError('Invalid resource ID format', 400);
  }

  // Get resource
  const resource = await Resource.findOne({
    _id: resourceId,
    status: 'active'
  })
    .populate('courseId', 'title')
    .lean();

  if (!resource) {
    throw new AppError('Resource not found', 404);
  }

  // Authorization checks (skip for CLO/Admin)
  if (userRole === 'student' || userRole === 'trainer' || userRole === 'teacher') {
    // Find all of the user's groups — students by enrollment, trainers by assignment.
    // NOTE: Do NOT restrict by `courseId: resource.courseId._id` here. A resource may
    // belong to a "bucket"/bundle course while the user's group belongs to one of its
    // sub-courses (or vice versa), so an exact courseId match would incorrectly deny
    // access. The real authorization check is the ResourceAssignment lookup below,
    // which already validates the group/resource relationship (including bundles).
    const groupQuery = userRole === 'student'
      ? { students: userId }
      : { trainerId: userId, status: 'active' };

    const studentGroups = await Group.find(groupQuery).select('_id').lean();

    if (studentGroups.length === 0) {
      throw new AppError(
        userRole === 'student'
          ? 'Access denied: Not enrolled in this course'
          : 'Access denied: Not assigned to this course as trainer',
        403
      );
    }

    const groupIds = studentGroups.map(g => g._id);

    // Verify resource is assigned to student's group
    const assignment = await ResourceAssignment.findOne({
      resourceId,
      groupId: { $in: groupIds },
      isVisible: true
    })
    .populate('sessionId', 'scheduledDate')
    .lean();

    if (!assignment) {
      throw new AppError('Access denied: Resource not assigned to your group', 403);
    }

    // Check availability dates if set
    if (assignment.availableFrom || assignment.availableUntil) {
      const now = new Date();
      if (assignment.availableFrom && now < assignment.availableFrom) {
        throw new AppError('Resource not yet available', 403);
      }
      if (assignment.availableUntil && now > assignment.availableUntil) {
        throw new AppError('Resource no longer available', 403);
      }
    }

  }

  // ✅ WEB: Use secure one-time token with IP-locking
  // ✅ MOBILE: Use direct Supabase signed URL (no token needed)
  if (!isMobile) {
    // WEB: Generate one-time-use, IP-locked secure token
    const clientIp = getClientIp(req);
    const secureToken = generateSecureToken(userId, resourceId, clientIp, 60);

    logger.info('Secure resource token generated (web)', {
      resourceId,
      userId,
      userRole,
      courseId: resource.courseId._id,
      clientIp,
      tokenExpiry: 60
    });

    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');

    res.json({
      success: true,
      data: {
        viewerUrl: `/api/student/resources/${resourceId}/download?token=${secureToken}`,
        expiresIn: 60,
        title: resource.title,
        filename: resource.originalName
      }
    });
  } else {
    // MOBILE: Generate direct Supabase signed URL for viewing (not downloading)
    const bucket = resource.storageBucket || process.env.SUPABASE_BUCKET || 'resources';

    // Use createSignedUrl with download option set to false for inline viewing
    const { data: signedUrlData, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(resource.fileUrl, 3600, {
        download: false // ✅ Open inline in viewer, not download
      });

    if (error || !signedUrlData) {
      logger.logError(error || new Error('No signed URL data'), {
        context: 'generate_signed_url',
        resourceId,
        fileUrl: resource.fileUrl,
        bucket
      });
      throw new AppError('Failed to generate viewer URL', 500);
    }

    logger.info('Resource accessed (mobile)', {
      resourceId,
      userId,
      userRole,
      courseId: resource.courseId._id
    });

    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');

    res.json({
      success: true,
      data: {
        viewerUrl: signedUrlData.signedUrl,
        expiresIn: 3600,
        title: resource.title,
        filename: resource.originalName
      }
    });
  }
});

// @desc    Download resource with one-time token
// @route   GET /api/student/resources/:resourceId/download
// @access  Private (Token-based, one-time use, IP-locked)
exports.downloadResource = asyncHandler(async (req, res) => {
  const { resourceId } = req.params;
  const { token } = req.query;
  const userId = req.user._id;
  const clientIp = getClientIp(req);

  // Validate token is provided
  if (!token) {
    throw new AppError('Access token required', 401);
  }

  // Validate and consume the one-time token
  const validation = validateAndConsumeToken(token, userId, resourceId, clientIp);

  if (!validation.valid) {
    logger.logSecurity('resource_access_denied', {
      reason: validation.error,
      resourceId,
      userId,
      clientIp
    });
    throw new AppError(`Access denied: ${validation.error}`, 403);
  }

  // Check if Supabase is configured
  if (!supabase) {
    throw new AppError('File storage is not configured', 503);
  }

  // Get resource
  const resource = await Resource.findOne({
    _id: resourceId,
    status: 'active'
  }).lean();

  if (!resource) {
    throw new AppError('Resource not found', 404);
  }

  // Download PDF directly from Supabase and stream to client
  // This avoids CORS issues that occur when redirecting to Supabase
  const bucket = resource.storageBucket || process.env.SUPABASE_BUCKET || 'resources';
  const { data: fileData, error } = await supabase.storage
    .from(bucket)
    .download(resource.fileUrl);

  if (error || !fileData) {
    logger.logError(error || new Error('Failed to download file'), {
      context: 'download_resource',
      resourceId,
      fileUrl: resource.fileUrl,
      bucket
    });
    throw new AppError('Failed to download resource', 500);
  }

  // Log successful access
  logger.info('Resource downloaded', {
    resourceId,
    userId,
    clientIp,
    filename: resource.originalName
  });

  // Send PDF bytes directly to client
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${resource.originalName}"`);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const arrayBuffer = await fileData.arrayBuffer();
  res.send(Buffer.from(arrayBuffer));
});

// @desc    Get all materials for a session
// @route   GET /api/student/sessions/:sessionId/materials
// @access  Private (Students in group)
exports.getSessionMaterials = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const studentId = req.user._id;
  
  // Validate sessionId
  if (!sessionId.match(/^[0-9a-fA-F]{24}$/)) {
    throw new AppError('Invalid session ID format', 400);
  }
  
  // Get session and verify student access
  const session = await Session.findById(sessionId)
    .populate('groupId', 'students courseId')
    .lean();
  
  if (!session) {
    throw new AppError('Session not found', 404);
  }
  
  // Verify student is in this group
  if (!session.groupId || !session.groupId.students) {
    throw new AppError('Session group not found', 404);
  }
  
  const isInGroup = session.groupId.students.some(
    s => {
      const studentIdStr = typeof s === 'object' && s._id 
        ? s._id.toString() 
        : s.toString();
      return studentIdStr === studentId.toString();
    }
  );
  
  if (!isInGroup) {
    throw new AppError('Access denied', 403);
  }
  
  // Get all resource assignments for this session
  const assignments = await ResourceAssignment.find({
    groupId: session.groupId._id,
    sessionId,
    isVisible: true
  })
      .populate({
        path: 'resourceId',
        match: { status: 'active' },
        select: 'title description fileSize originalName'
      })
    .lean();
  
  // Filter out deleted resources and map to materials format
  const materials = assignments
    .filter(a => a.resourceId !== null)
      .map(a => ({
        id: a.resourceId._id.toString(),
        title: a.resourceId.title,
        description: a.resourceId.description || null,
        fileSize: a.resourceId.fileSize,
        originalName: a.resourceId.originalName,
        viewerUrl: `/api/student/resources/${a.resourceId._id}/viewer`,
        assignedAt: a.assignedAt
      }));
  
  logger.info('Session materials retrieved', {
    sessionId,
    studentId,
    materialsCount: materials.length
  });
  
  res.json({
    success: true,
    count: materials.length,
    data: materials
  });
});
