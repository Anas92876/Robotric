const asyncHandler = require('../utils/asyncHandler');
const { AppError, ValidationError } = require('../utils/errors');
const Resource = require('../models/Resource');
const ResourceAssignment = require('../models/ResourceAssignment');
const Course = require('../models/Course');
const Group = require('../models/Group');
const Session = require('../models/Session');
const supabase = require('../config/supabase');
const logger = require('../utils/logger');
const mongoose = require('mongoose');
const { sendNotificationToUsers, getUserIdsByGroup } = require('../services/notification.service');

// @desc    Upload PDF resource (course level)
// @route   POST /api/clo/resources/upload
// @access  Private (CLO, Admin only)
exports.uploadResource = asyncHandler(async (req, res) => {
  const uploadedBy = req.user._id;
  const userRole = req.user.role;
  
  // Authorization check
  if (userRole !== 'clo' && userRole !== 'admin' && userRole !== 'superadmin') {
    throw new AppError('Only CLO can upload resources', 403);
  }
  
  // Check if Supabase is configured
  if (!supabase) {
    throw new AppError('File storage is not configured. Please contact administrator.', 503);
  }
  
  // Check if file exists
  if (!req.file) {
    throw new AppError('PDF file is required', 400);
  }
  
  const { title, description, courseId } = req.body;
  
  // Validate inputs
  if (!title || title.trim().length < 3) {
    throw new AppError('Title must be at least 3 characters', 400);
  }
  
  if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
    throw new AppError('Valid course ID is required', 400);
  }
  
  // Verify course exists
  const course = await Course.findById(courseId);
  if (!course) {
    throw new AppError('Course not found', 404);
  }
  
  // Generate storage path
  const timestamp = Date.now();
  const sanitizedFilename = req.file.originalname
    .replace(/[^a-zA-Z0-9.-]/g, '-')
    .toLowerCase()
    .substring(0, 100);
  const storagePath = `resources/${courseId}/${timestamp}-${sanitizedFilename}`;
  let uploadData = null; // Track if upload succeeded for cleanup
  
  try {
    // Check if Supabase is configured
    if (!supabase) {
      logger.logError(new Error('Supabase not configured'), { context: 'supabase_not_configured' });
      throw new AppError('File storage service is not configured', 503);
    }

    // Upload to Supabase with retry logic
    const bucket = process.env.SUPABASE_BUCKET || 'resources';
    let uploadError = null;
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      const result = await supabase.storage
        .from(bucket)
        .upload(storagePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });
      
      uploadData = result.data;
      uploadError = result.error;

      if (!uploadError && uploadData) {
        break; // Success
      }

      // Check if error is retryable (network errors, timeouts)
      const isRetryable = uploadError.message?.includes('timeout') ||
                         uploadError.message?.includes('network') ||
                         uploadError.message?.includes('ECONNREFUSED') ||
                         uploadError.statusCode === 408 ||
                         uploadError.statusCode === 429 ||
                         (uploadError.statusCode >= 500 && uploadError.statusCode < 600);

      if (!isRetryable || retryCount === maxRetries - 1) {
        break; // Not retryable or last attempt
      }

      retryCount++;
      const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000); // Exponential backoff, max 5s
      logger.logError(uploadError, {
        context: 'supabase_upload_retry',
        storagePath,
        retryCount,
        maxRetries,
        delay
      });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    if (uploadError) {
      logger.logError(uploadError, {
        context: 'supabase_upload_failed',
        storagePath,
        retryCount,
        errorMessage: uploadError.message,
        errorStatus: uploadError.statusCode
      });

      // Provide more specific error messages
      if (uploadError.message?.includes('already exists') || uploadError.statusCode === 409) {
        throw new AppError('A file with this name already exists', 409);
      } else if (uploadError.statusCode === 413 || uploadError.message?.includes('too large')) {
        throw new AppError('File size exceeds storage limit', 413);
      } else if (uploadError.statusCode === 401 || uploadError.statusCode === 403) {
        throw new AppError('Storage service authentication failed', 503);
      } else if (uploadError.message?.includes('fetch failed')) {
        // Detailed logging for environmental network issues
        logger.logError(uploadError, {
          context: 'supabase_fetch_failed_diagnostics',
          cause: uploadError.cause,
          stack: uploadError.stack
        });
        throw new AppError('Failed to upload file: Network connection to storage service failed', 500);
      } else {
        throw new AppError(`Failed to upload file to storage: ${uploadError.message || 'Unknown error'}`, 500);
      }
    }
    
    // Create resource record
    const resource = await Resource.create({
      title: title.trim(),
      description: description?.trim() || '',
      originalName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      fileUrl: storagePath,
      storageBucket: bucket,
      storageProvider: 'supabase',
      courseId,
      uploadedBy,
      status: 'active',
      version: 1
    });
    
    // Populate response data
    await resource.populate('courseId', 'title category level');
    await resource.populate('uploadedBy', 'name email');
    
    logger.info('Resource uploaded successfully', {
      resourceId: resource._id,
      courseId,
      uploadedBy,
      fileSize: req.file.size
    });
    
    res.status(201).json({
      success: true,
      message: 'Resource uploaded successfully',
      data: resource
    });
    
  } catch (error) {
    // Cleanup: Delete from Supabase if DB save fails or if error occurred after upload
    if (storagePath && supabase && uploadData) {
      const bucket = process.env.SUPABASE_BUCKET || 'resources';
      try {
        await supabase.storage
          .from(bucket)
          .remove([storagePath]);
        logger.info('Cleaned up uploaded file after error', { storagePath });
      } catch (cleanupError) {
        logger.logError(cleanupError, {
          context: 'cleanup_uploaded_file_failed',
          storagePath
        });
        // Don't throw - cleanup failure is not critical
      }
    }
    
    // Handle duplicate errors
    if (error.code === 11000) {
      throw new AppError('Resource with this name already exists', 409);
    }
    
    // Re-throw AppError as-is
    if (error instanceof AppError) {
      throw error;
    }
    
    // Wrap unexpected errors
    logger.logError(error, {
      context: 'resource_upload_unexpected_error',
      storagePath
    });
    throw new AppError('Failed to upload resource', 500);
  }
});

// @desc    Get resources by course
// @route   GET /api/clo/resources?courseId={courseId}
// @access  Private (CLO, Admin, Trainer)
exports.getResources = asyncHandler(async (req, res) => {
  const { courseId, category, status = 'active', search, sortBy = 'createdAt', order = 'desc' } = req.query;
  
  // Build query
  const query = { status };
  
  if (courseId) {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw new AppError('Invalid course ID format', 400);
    }
    query.courseId = courseId;
  }
  
  if (category) {
    query.category = category;
  }
  
  if (search) {
    query.$text = { $search: search };
  }
  
  // Execute query
  const resources = await Resource.find(query)
    .populate('courseId', 'title category level')
    .populate('uploadedBy', 'name email')
    .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
    .lean();
  
  // Get assignment counts and details for each resource
  const resourcesWithAssignments = await Promise.all(
    resources.map(async (resource) => {
      const assignments = await ResourceAssignment.find({
        resourceId: resource._id,
        isVisible: true
      })
        .populate('groupId', 'name')
        .populate('sessionId', 'sessionNumber title scheduledDate')
        .lean();
      
      // Group assignments by group (skip assignments with missing group/session refs)
      const assignmentsByGroup = {};
      assignments.forEach((assignment) => {
        if (!assignment.groupId || !assignment.sessionId) return;
        const groupId = assignment.groupId._id.toString();
        if (!assignmentsByGroup[groupId]) {
          assignmentsByGroup[groupId] = {
            groupId: assignment.groupId._id,
            groupName: assignment.groupId.name,
            sessions: []
          };
        }
        assignmentsByGroup[groupId].sessions.push({
          sessionId: assignment.sessionId._id,
          sessionNumber: assignment.sessionId.sessionNumber,
          title: assignment.sessionId.title,
          scheduledDate: assignment.sessionId.scheduledDate
        });
      });
      
      return {
        ...resource,
        assignments: {
          groupCount: Object.keys(assignmentsByGroup).length,
          sessionCount: assignments.length,
          details: Object.values(assignmentsByGroup)
        }
      };
    })
  );
  
  res.json({
    success: true,
    count: resourcesWithAssignments.length,
    data: resourcesWithAssignments
  });
});

// @desc    Assign resource to groups/sessions
// @route   POST /api/clo/resources/:resourceId/assign
// @access  Private (CLO, Admin only)
exports.assignResource = asyncHandler(async (req, res) => {
  const { resourceId } = req.params;
  const { assignments } = req.body;
  const assignedBy = req.user._id;
  
  // Validate resourceId
  if (!mongoose.Types.ObjectId.isValid(resourceId)) {
    throw new AppError('Invalid resource ID', 400);
  }
  
  // Verify resource exists
  const resource = await Resource.findById(resourceId);
  if (!resource || resource.status !== 'active') {
    throw new AppError('Resource not found or inactive', 404);
  }
  
  // Validate assignments array
  if (!Array.isArray(assignments) || assignments.length === 0) {
    throw new AppError('Assignments array is required', 400);
  }
  
  // Validate and prepare assignment documents
  const assignmentDocs = [];
  const validationErrors = [];
  
  for (const assignment of assignments) {
    const { groupId, sessionIds } = assignment;
    
    if (!groupId || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      validationErrors.push('Each assignment must have groupId and sessionIds array');
      continue;
    }
    
    // Verify group exists and belongs to same course
    const group = await Group.findById(groupId);
    if (!group) {
      validationErrors.push(`Group ${groupId} not found`);
      continue;
    }
    
    // Verify each session belongs to this group
    for (const sessionId of sessionIds) {
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        validationErrors.push(`Invalid session ID: ${sessionId}`);
        continue;
      }
      
      const session = await Session.findById(sessionId);
      
      if (!session) {
        validationErrors.push(`Session ${sessionId} not found`);
        continue;
      }
      
      const sessionGroupId = session.groupId?.toString() || session.groupId.toString();
      if (sessionGroupId !== groupId.toString()) {
        validationErrors.push(`Session does not belong to group`);
        continue;
      }
      
      // Check if assignment already exists
      const existingAssignment = await ResourceAssignment.findOne({
        resourceId,
        groupId,
        sessionId
      });
      
      if (!existingAssignment) {
        assignmentDocs.push({
          resourceId,
          groupId,
          sessionId,
          assignedBy,
          assignedAt: new Date(),
          isVisible: true
        });
      }
    }
  }
  
  // Return validation errors if any
  if (validationErrors.length > 0 && assignmentDocs.length === 0) {
    throw new ValidationError('Validation failed', validationErrors);
  }
  
  // Bulk insert assignments
  let createdAssignments = [];
  if (assignmentDocs.length > 0) {
    try {
      createdAssignments = await ResourceAssignment.insertMany(assignmentDocs, {
        ordered: false  // Continue on duplicate key errors
      });
    } catch (error) {
      // Handle duplicate key errors gracefully
      if (error.code === 11000) {
        // Some assignments already exist, but others may have been created
        // Try to find what was actually created
        const createdIds = assignmentDocs.map(doc => ({
          resourceId: doc.resourceId,
          groupId: doc.groupId,
          sessionId: doc.sessionId
        }));
        
        createdAssignments = await ResourceAssignment.find({
          $or: createdIds
        }).lean();
      } else {
        throw error;
      }
    }
  }
  
  // Calculate summary
  const groupCount = new Set(assignmentDocs.map(a => a.groupId.toString())).size;
  const sessionCount = assignmentDocs.length;
  
  logger.info('Resource assigned', {
    resourceId,
    assignedBy,
    groupsAssigned: groupCount,
    sessionsAssigned: sessionCount
  });

  // Send notifications to all students in groups that received resources
  try {
    // Get unique group IDs from assignments
    const uniqueGroupIds = [...new Set(assignmentDocs.map(a => a.groupId.toString()))];
    
    // Get all students from all groups
    const allStudentIds = new Set();
    for (const groupId of uniqueGroupIds) {
      try {
        const groupStudentIds = await getUserIdsByGroup(groupId);
        groupStudentIds.forEach(id => allStudentIds.add(id.toString()));
      } catch (error) {
        logger.warn(`Failed to get students for group ${groupId}: ${error.message}`);
      }
    }

    const studentIdsArray = Array.from(allStudentIds);
    
    if (studentIdsArray.length > 0) {
      const notificationBody = `${resource.title} is now available`;
      
      await sendNotificationToUsers(
        studentIdsArray,
        'New Resource Available',
        notificationBody,
        {
          type: 'resource',
          resourceId: resourceId.toString(),
          courseId: resource.courseId.toString(),
          screen: 'resource'
        }
      );
      
      logger.info(`Resource notifications sent to ${studentIdsArray.length} students`, {
        resourceId,
        studentCount: studentIdsArray.length,
        groupCount: uniqueGroupIds.length
      });
    }
  } catch (notificationError) {
    // Log but don't fail the request
    logger.error(`Failed to send resource notifications: ${notificationError.message}`, {
      resourceId,
      error: notificationError
    });
  }
  
  res.status(201).json({
    success: true,
    message: `Resource assigned to ${groupCount} group(s), ${sessionCount} session(s)`,
    data: {
      assignmentsCreated: createdAssignments.length,
      totalGroups: groupCount,
      totalSessions: sessionCount,
      validationErrors: validationErrors.length > 0 ? validationErrors : undefined
    }
  });
});

// @desc    Get assignments for resource
// @route   GET /api/clo/resources/:resourceId/assignments
// @access  Private (CLO, Admin, Trainer)
exports.getResourceAssignments = asyncHandler(async (req, res) => {
  const { resourceId } = req.params;
  
  // Validate resourceId
  if (!mongoose.Types.ObjectId.isValid(resourceId)) {
    throw new AppError('Invalid resource ID format', 400);
  }
  
  // Get resource
  const resource = await Resource.findById(resourceId)
    .populate('courseId', 'title')
    .lean();
  
  if (!resource) {
    throw new AppError('Resource not found', 404);
  }
  
  // Get all assignments
  const assignments = await ResourceAssignment.find({ resourceId })
    .populate('groupId', 'name students')
    .populate('sessionId', 'sessionNumber title scheduledDate startTime endTime')
    .populate('assignedBy', 'name email')
    .sort({ assignedAt: -1 })
    .lean();
  
  // Group by groupId
  const groupedAssignments = {};
  assignments.forEach(assignment => {
    const groupId = assignment.groupId._id.toString();
    
    if (!groupedAssignments[groupId]) {
      groupedAssignments[groupId] = {
        groupId: assignment.groupId._id,
        groupName: assignment.groupId.name,
        studentsCount: assignment.groupId.students?.length || 0,
        sessions: []
      };
    }
    
    groupedAssignments[groupId].sessions.push({
      assignmentId: assignment._id,
      sessionId: assignment.sessionId._id,
      sessionNumber: assignment.sessionId.sessionNumber,
      title: assignment.sessionId.title,
      scheduledDate: assignment.sessionId.scheduledDate,
      startTime: assignment.sessionId.startTime,
      endTime: assignment.sessionId.endTime,
      isVisible: assignment.isVisible,
      assignedAt: assignment.assignedAt
    });
  });
  
  res.json({
    success: true,
    data: {
      resourceId: resource._id,
      resourceTitle: resource.title,
      courseId: resource.courseId._id,
      courseTitle: resource.courseId.title,
      totalGroups: Object.keys(groupedAssignments).length,
      totalSessions: assignments.length,
      assignments: Object.values(groupedAssignments)
    }
  });
});

// @desc    Update assignments (replace for a group)
// @route   PUT /api/clo/resources/:resourceId/assignments
// @access  Private (CLO, Admin only)
exports.updateResourceAssignments = asyncHandler(async (req, res) => {
  const { resourceId } = req.params;
  const { groupId, sessionIds } = req.body;
  const assignedBy = req.user._id;
  
  // Validation
  if (!mongoose.Types.ObjectId.isValid(resourceId)) {
    throw new AppError('Invalid resource ID', 400);
  }
  
  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    throw new AppError('Invalid group ID', 400);
  }
  
  if (!Array.isArray(sessionIds)) {
    throw new AppError('sessionIds must be an array', 400);
  }
  
  // Verify resource and group exist
  const resource = await Resource.findById(resourceId);
  if (!resource) {
    throw new AppError('Resource not found', 404);
  }
  
  const group = await Group.findById(groupId);
  if (!group) {
    throw new AppError('Group not found', 404);
  }

  // Verify group belongs to resource's course, or to one of its sub-courses (bundle support)
  const groupCourseId = group.courseId.toString();
  const resourceCourseId = resource.courseId.toString();

  if (groupCourseId !== resourceCourseId) {
    const resourceCourse = await Course.findById(resourceCourseId).select('type bundleCourses').lean();
    const groupCourse = await Course.findById(groupCourseId).select('type bundleCourses').lean();

    const resourceIsBundleOfGroup = resourceCourse?.type === 'bundle' &&
      (resourceCourse.bundleCourses || []).some((id) => id.toString() === groupCourseId);
    const groupIsBundleOfResource = groupCourse?.type === 'bundle' &&
      (groupCourse.bundleCourses || []).some((id) => id.toString() === resourceCourseId);

    if (!resourceIsBundleOfGroup && !groupIsBundleOfResource) {
      throw new AppError('Group does not belong to resource\'s course', 400);
    }
  }
  
  // Delete existing assignments for this group
  await ResourceAssignment.deleteMany({
    resourceId,
    groupId
  });
  
  // Create new assignments
  const newAssignments = sessionIds
    .filter(sessionId => mongoose.Types.ObjectId.isValid(sessionId))
    .map(sessionId => ({
      resourceId,
      groupId,
      sessionId,
      assignedBy,
      assignedAt: new Date(),
      isVisible: true
    }));
  
  if (newAssignments.length > 0) {
    await ResourceAssignment.insertMany(newAssignments, { ordered: false });
  }
  
  logger.info('Resource assignments updated', {
    resourceId,
    groupId,
    sessionCount: newAssignments.length
  });
  
  res.json({
    success: true,
    message: `Assignments updated: ${newAssignments.length} sessions`,
    data: {
      groupId,
      sessionCount: newAssignments.length
    }
  });
});

// @desc    Delete single assignment
// @route   DELETE /api/clo/resources/:resourceId/assignments/:assignmentId
// @access  Private (CLO, Admin only)
exports.deleteAssignment = asyncHandler(async (req, res) => {
  const { resourceId, assignmentId } = req.params;
  
  // Validate IDs
  if (!mongoose.Types.ObjectId.isValid(resourceId) || !mongoose.Types.ObjectId.isValid(assignmentId)) {
    throw new AppError('Invalid ID format', 400);
  }
  
  const assignment = await ResourceAssignment.findOneAndDelete({
    _id: assignmentId,
    resourceId
  });
  
  if (!assignment) {
    throw new AppError('Assignment not found', 404);
  }
  
  logger.info('Assignment deleted', {
    assignmentId,
    resourceId
  });
  
  res.json({
    success: true,
    message: 'Assignment removed successfully'
  });
});

// @desc    Delete resource (soft or permanent)
// @route   DELETE /api/clo/resources/:resourceId
// @access  Private (CLO, Admin only)
exports.deleteResource = asyncHandler(async (req, res) => {
  const { resourceId } = req.params;
  const { permanent = false } = req.query;
  
  // Validate resourceId
  if (!mongoose.Types.ObjectId.isValid(resourceId)) {
    throw new AppError('Invalid resource ID format', 400);
  }
  
  const resource = await Resource.findById(resourceId);
  
  if (!resource) {
    throw new AppError('Resource not found', 404);
  }
  
  if (permanent === 'true' || permanent === true) {
    // Hard delete: Remove from storage and database
    if (supabase && resource.storageProvider === 'supabase') {
      const bucket = resource.storageBucket || process.env.SUPABASE_BUCKET || 'resources';
      const { error: deleteError } = await supabase.storage
        .from(bucket)
        .remove([resource.fileUrl]);
      
      if (deleteError) {
        logger.logError(deleteError, { 
          context: 'supabase_delete',
          resourceId,
          fileUrl: resource.fileUrl 
        });
        // Continue with deletion even if storage delete fails
      }
    }
    
    // Delete all assignments
    await ResourceAssignment.deleteMany({ resourceId });
    
    // Delete resource
    await Resource.deleteOne({ _id: resourceId });
    
    logger.info('Resource permanently deleted', {
      resourceId,
      fileUrl: resource.fileUrl
    });
    
    res.json({
      success: true,
      message: 'Resource permanently deleted'
    });
  } else {
    // Soft delete: Mark as deleted
    resource.status = 'deleted';
    resource.archivedAt = new Date();
    await resource.save();
    
    logger.info('Resource soft deleted', {
      resourceId
    });
    
    res.json({
      success: true,
      message: 'Resource archived (soft deleted)'
    });
  }
});

// @desc    Get PDF viewer URL (generates signed URL)
// @route   GET /api/clo/resources/:resourceId/viewer
// @access  Private (CLO, Admin, Superadmin)
exports.getViewerUrl = asyncHandler(async (req, res) => {
  const { resourceId } = req.params;

  // Validate resourceId
  if (!mongoose.Types.ObjectId.isValid(resourceId)) {
    throw new AppError('Invalid resource ID format', 400);
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

  // Generate signed URL (1 hour expiration)
  const bucket = resource.storageBucket || process.env.SUPABASE_BUCKET || 'resources';
  const { data: signedUrlData, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(resource.fileUrl, 3600);

  if (error || !signedUrlData) {
    logger.logError(error || new Error('No signed URL data'), {
      context: 'clo_generate_signed_url',
      resourceId,
      fileUrl: resource.fileUrl,
      bucket
    });
    throw new AppError('Failed to generate viewer URL', 500);
  }

  res.json({
    success: true,
    data: {
      viewerUrl: signedUrlData.signedUrl,
      expiresIn: 3600,
      title: resource.title,
      filename: resource.originalName
    }
  });
});

// @desc    Rename (update title/description of) a resource
// @route   PUT /api/clo/resources/:resourceId
// @access  Private (CLO, Admin only)
exports.renameResource = asyncHandler(async (req, res) => {
  const { resourceId } = req.params;
  const { title, description } = req.body;

  if (!title || title.trim().length < 1) {
    throw new AppError('Title is required', 400);
  }

  const resource = await Resource.findOneAndUpdate(
    { _id: resourceId, status: 'active' },
    { title: title.trim(), ...(description !== undefined && { description: description.trim() }) },
    { new: true }
  ).populate('courseId', 'title category');

  if (!resource) {
    throw new AppError('Resource not found', 404);
  }

  res.json({ success: true, message: 'Resource renamed successfully', data: resource });
});
