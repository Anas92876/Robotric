const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Enrollment = require('../models/Enrollment');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/assignments');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'zip', 'rar'];
  const ext = path.extname(file.originalname).toLowerCase().slice(1);

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new AppError(`File type .${ext} is not allowed`, 400), false);
  }
};

exports.upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB default
  }
});

// @desc    Get assignment details
// @route   GET /api/student/assignments/:assignmentId
// @access  Private (Student)
exports.getAssignment = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const studentId = req.user._id;

  const assignment = await Assignment.findById(assignmentId)
    .populate('module', 'title order')
    .populate('course', 'title');

  if (!assignment || !assignment.isActive) {
    throw new AppError('Assignment not found', 404);
  }

  // Check enrollment
  const enrollment = await Enrollment.findOne({
    student: studentId,
    course: assignment.course,
    status: { $in: ['active', 'completed'] }
  });

  if (!enrollment) {
    throw new AppError('You are not enrolled in this course', 403);
  }

  // Get student's submission if exists
  const submission = await AssignmentSubmission.getLatestSubmission(studentId, assignmentId);

  res.json({
    success: true,
    data: {
      assignment,
      submission,
      isOverdue: assignment.isOverdue,
      canSubmit: !submission || (submission.resubmission.allowed && submission.status === 'resubmit_required')
    }
  });
});

// @desc    Submit assignment
// @route   POST /api/student/assignments/:assignmentId/submit
// @access  Private (Student)
exports.submitAssignment = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const studentId = req.user._id;

  if (!req.files || req.files.length === 0) {
    throw new AppError('No files uploaded', 400);
  }

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment || !assignment.isActive) {
    throw new AppError('Assignment not found', 404);
  }

  // Check enrollment
  const enrollment = await Enrollment.findOne({
    student: studentId,
    course: assignment.course,
    status: 'active'
  });

  if (!enrollment) {
    throw new AppError('You are not enrolled in this course', 403);
  }

  // Check if too many files
  if (req.files.length > assignment.maxFiles) {
    // Clean up uploaded files
    for (const file of req.files) {
      await fs.unlink(file.path).catch(() => {});
    }
    throw new AppError(`Maximum ${assignment.maxFiles} files allowed`, 400);
  }

  // Validate file types and sizes
  for (const file of req.files) {
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (!assignment.isFileTypeAllowed(ext)) {
      // Clean up
      for (const f of req.files) {
        await fs.unlink(f.path).catch(() => {});
      }
      throw new AppError(`File type .${ext} is not allowed`, 400);
    }

    if (file.size > assignment.maxFileSize * 1024 * 1024) {
      for (const f of req.files) {
        await fs.unlink(f.path).catch(() => {});
      }
      throw new AppError(`File size exceeds ${assignment.maxFileSize}MB limit`, 400);
    }
  }

  // Check for late submission
  const submittedAt = new Date();
  const isLate = assignment.isSubmissionLate(submittedAt);

  if (isLate && !assignment.allowLateSubmission) {
    // Clean up
    for (const file of req.files) {
      await fs.unlink(file.path).catch(() => {});
    }
    throw new AppError('Late submissions are not allowed for this assignment', 400);
  }

  // Check if it's a resubmission
  const existingSubmission = await AssignmentSubmission.getLatestSubmission(studentId, assignmentId);
  let version = 1;

  if (existingSubmission) {
    if (!existingSubmission.resubmission.allowed || existingSubmission.status !== 'resubmit_required') {
      // Clean up
      for (const file of req.files) {
        await fs.unlink(file.path).catch(() => {});
      }
      throw new AppError('You cannot resubmit this assignment', 400);
    }
    version = existingSubmission.version + 1;
    existingSubmission.resubmission.count += 1;
    await existingSubmission.save();
  }

  // Prepare file data
  const files = req.files.map(file => ({
    filename: file.filename,
    originalName: file.originalname,
    fileUrl: `/uploads/assignments/${file.filename}`,
    fileType: path.extname(file.originalname).toLowerCase().slice(1),
    fileSize: file.size,
    uploadedAt: new Date()
  }));

  // Create submission
  const submission = await AssignmentSubmission.create({
    student: studentId,
    assignment: assignmentId,
    course: assignment.course,
    files,
    submittedAt,
    isLate,
    status: 'submitted',
    version
  });

  logger.info('Assignment submitted', {
    studentId,
    assignmentId,
    version,
    fileCount: files.length,
    isLate
  });

  res.status(201).json({
    success: true,
    message: isLate ? 'Late submission received' : 'Assignment submitted successfully',
    data: submission
  });
});

// @desc    Get submission status
// @route   GET /api/student/assignments/:assignmentId/submission
// @access  Private (Student)
exports.getSubmissionStatus = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const studentId = req.user._id;

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    throw new AppError('Assignment not found', 404);
  }

  // Get all submissions
  const submissions = await AssignmentSubmission.find({
    student: studentId,
    assignment: assignmentId
  })
    .populate('grade.gradedBy', 'name')
    .sort({ version: -1 });

  // Get latest submission
  const latestSubmission = submissions[0] || null;

  res.json({
    success: true,
    data: {
      assignmentId,
      hasSubmitted: submissions.length > 0,
      submissionCount: submissions.length,
      latestSubmission,
      allSubmissions: submissions,
      assignment: {
        title: assignment.title,
        dueDate: assignment.dueDate,
        maxScore: assignment.maxScore,
        isOverdue: assignment.isOverdue
      }
    }
  });
});

// @desc    Delete submission (before grading)
// @route   DELETE /api/student/assignments/submissions/:submissionId
// @access  Private (Student)
exports.deleteSubmission = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;
  const studentId = req.user._id;

  const submission = await AssignmentSubmission.findOne({
    _id: submissionId,
    student: studentId
  });

  if (!submission) {
    throw new AppError('Submission not found', 404);
  }

  // Check if already graded
  if (submission.status === 'graded' || submission.status === 'returned') {
    throw new AppError('Cannot delete graded submission', 400);
  }

  // Delete files
  for (const file of submission.files) {
    const filePath = path.join(__dirname, '../../', file.fileUrl);
    await fs.unlink(filePath).catch(() => {});
  }

  await submission.deleteOne();

  logger.info('Submission deleted', {
    studentId,
    submissionId
  });

  res.json({
    success: true,
    message: 'Submission deleted successfully'
  });
});

// @desc    Add comment to submission
// @route   POST /api/student/assignments/submissions/:submissionId/comments
// @access  Private (Student)
exports.addComment = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;
  const studentId = req.user._id;
  const { text } = req.body;

  if (!text) {
    throw new AppError('Comment text is required', 400);
  }

  const submission = await AssignmentSubmission.findOne({
    _id: submissionId,
    student: studentId
  });

  if (!submission) {
    throw new AppError('Submission not found', 404);
  }

  submission.addComment(studentId, text);
  await submission.save();

  res.json({
    success: true,
    message: 'Comment added',
    data: submission.comments[submission.comments.length - 1]
  });
});

module.exports = exports;
