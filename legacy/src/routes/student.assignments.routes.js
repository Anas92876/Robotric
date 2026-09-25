const express = require('express');
const router = express.Router();
const { protect: authenticate } = require('../middleware/auth');
const {
  getAssignment,
  submitAssignment,
  getSubmissionStatus,
  deleteSubmission,
  addComment,
  upload
} = require('../controllers/student.assignments.controller');

// All routes require authentication
router.use(authenticate);

// @route   GET /api/student/assignments/:assignmentId
router.get('/:assignmentId', getAssignment);

// @route   POST /api/student/assignments/:assignmentId/submit
router.post('/:assignmentId/submit', upload.array('files', 10), submitAssignment);

// @route   GET /api/student/assignments/:assignmentId/submission
router.get('/:assignmentId/submission', getSubmissionStatus);

// @route   DELETE /api/student/assignments/submissions/:submissionId
router.delete('/submissions/:submissionId', deleteSubmission);

// @route   POST /api/student/assignments/submissions/:submissionId/comments
router.post('/submissions/:submissionId/comments', addComment);

module.exports = router;
