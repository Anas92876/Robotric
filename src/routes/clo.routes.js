const express = require('express');
const router = express.Router();
const { protect, requireCLO } = require('../middleware/auth');

// Import controllers
const {
  getDashboardStats,
  getAnalyticsOverview
} = require('../controllers/clo.dashboard.controller');

const {
  getContent,
  upsertContent,
  uploadProgramImage,
  deleteProgramImage,
  uploadDepartmentCover,
  deleteDepartmentCover,
  uploadDeptProgramImage,
  deleteDeptProgramImage,
} = require('../controllers/clo.trainingContent.controller');

const {
  getAllTrainers,
  createTrainer,
  updateTrainer,
  deactivateTrainer,
  getTrainerPerformance,
  assignTrainerToCourse,
  removeTrainerFromCourse
} = require('../controllers/clo.trainers.controller');

const {
  getAllCourses,
  getCourseDetails,
  createCourse,
  updateCourse,
  deleteCourse,
  archiveCourse,
  getCourseStatistics,
  getBundleSubCourses,
  addSubCourse,
  removeSubCourse
} = require('../controllers/clo.courses.controller');

const {
  getAllGroups,
  getGroupDetails,
  createGroup,
  updateGroup,
  deleteGroup,
  closeGroup,
  assignTrainerToGroup,
  getGroupStudents,
  addStudentToGroup,
  removeStudentFromGroup,
  getGroupSessions,
  toggleGroupBoard
} = require('../controllers/clo.groups.controller');

const {
  getAllEvaluations,
  getEvaluationById,
  getGroupEvaluations,
  getEvaluationStats
} = require('../controllers/clo.evaluations.controller');

const {
  getAllAttendance,
  getAttendanceById,
  getCourseAttendance,
  getAttendanceStats
} = require('../controllers/clo.attendance.controller');

const {
  getAllCriteria,
  getCriteriaById,
  createCriteria,
  updateCriteria,
  deleteCriteria
} = require('../controllers/clo.evaluationCriteria.controller');

const {
  getAllInterests,
  getInterestById,
  createInterest,
  updateInterest,
  deleteInterest,
  archiveInterest
} = require('../controllers/clo.interests.controller');

const {
  getSubscriptionPlans,
  getSubscriptionPlan,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan
} = require('../controllers/clo.subscriptionPlans.controller');

// All routes require authentication
router.use(protect);

// Apply CLO requirement to most routes, but allow trainers for read-only resource endpoints
const { restrictTo } = require('../middleware/auth');

router.use((req, res, next) => {
  // Routes that allow trainers: GET /resources, GET /resources/:id/assignments
  if ((req.path === '/resources' && req.method === 'GET') ||
      (req.path.match(/^\/resources\/[^/]+\/assignments$/) && req.method === 'GET')) {
    return restrictTo('clo', 'admin', 'superadmin', 'trainer')(req, res, next);
  }
  // All other routes require CLO
  return requireCLO(req, res, next);
});

// ====================
// Dashboard Routes
// ====================
router.get('/dashboard', getDashboardStats);
router.get('/analytics', getAnalyticsOverview);

// ====================
// Trainer Management
// ====================
router.get('/trainers', getAllTrainers);
router.post('/trainers', createTrainer);
router.put('/trainers/:id', updateTrainer);
router.delete('/trainers/:id', deactivateTrainer);
router.get('/trainers/:id/performance', getTrainerPerformance);
router.post('/trainers/:id/assign-course', assignTrainerToCourse);
router.delete('/trainers/:trainerId/courses/:courseId', removeTrainerFromCourse);

// ====================
// Course Management
// ====================
router.get('/courses', getAllCourses);
router.get('/courses/:id', getCourseDetails);
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);
router.delete('/courses/:id', deleteCourse);
router.put('/courses/:id/archive', archiveCourse);
router.get('/courses/:id/statistics', getCourseStatistics);

// Bundle sub-course management
router.get('/courses/:bundleId/sub-courses', getBundleSubCourses);
router.post('/courses/:bundleId/sub-courses', addSubCourse);
router.delete('/courses/:bundleId/sub-courses/:courseId', removeSubCourse);

// ====================
// Group Management
// ====================
router.get('/groups', getAllGroups);
router.get('/groups/:id', getGroupDetails);
router.get('/groups/:id/sessions', getGroupSessions); // Get all sessions for a group
router.post('/groups', createGroup);
router.put('/groups/:id', updateGroup);
router.delete('/groups/:id', deleteGroup);
router.put('/groups/:id/status', closeGroup);
router.post('/groups/:id/assign-trainer', assignTrainerToGroup);
router.get('/groups/:id/students', getGroupStudents);
router.post('/groups/:id/students', addStudentToGroup);
router.delete('/groups/:id/students/:studentId', removeStudentFromGroup);
router.patch('/groups/:id/board', toggleGroupBoard);

// ====================
// Evaluation Management (View Only)
// ====================
router.get('/evaluations', getAllEvaluations);
router.get('/evaluations/stats', getEvaluationStats);
router.get('/evaluations/group/:groupId', getGroupEvaluations);
router.get('/evaluations/:id', getEvaluationById);

// ====================
// Attendance Management (View Only)
// ====================
router.get('/attendance', getAllAttendance);
router.get('/attendance/stats', getAttendanceStats);
router.get('/attendance/course/:courseId', getCourseAttendance);
router.get('/attendance/:id', getAttendanceById);

// ====================
// Evaluation Criteria Management
// ====================
router.get('/evaluation-criteria', getAllCriteria);
router.get('/evaluation-criteria/:id', getCriteriaById);
router.post('/evaluation-criteria', createCriteria);
router.put('/evaluation-criteria/:id', updateCriteria);
router.delete('/evaluation-criteria/:id', deleteCriteria);

// ====================
// Interest Management
// ====================
router.get('/interests', getAllInterests);
router.get('/interests/:id', getInterestById);
router.post('/interests', createInterest);
router.put('/interests/:id', updateInterest);
router.delete('/interests/:id', deleteInterest);
router.put('/interests/:id/archive', archiveInterest);

// ====================
// Resource Management (PDF Upload - New System)
// ====================
const {
  uploadResource,
  getResources,
  getViewerUrl, // Added for viewing PDFs as admin
  assignResource,
  getResourceAssignments,
  updateResourceAssignments,
  deleteAssignment,
  deleteResource,
  renameResource
} = require('../controllers/clo.resources.controller');

const pdfUpload = require('../middleware/pdf-upload');
const upload = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/resource-rateLimiting');

// Note: requireCLO is already applied to all routes via router.use() above

// Upload PDF resource (course level)
router.post('/resources/upload',
  uploadLimiter,
  pdfUpload.single('pdf'),
  uploadResource
);

// Get resources (with assignments) - CLO, Admin, Trainer
router.get('/resources', getResources);

// View resource PDF (Signed URL)
router.get('/resources/:resourceId/viewer', getViewerUrl);

// Assign resource to groups/sessions
router.post('/resources/:resourceId/assign', assignResource);

// Get assignments for resource - CLO, Admin, Trainer
router.get('/resources/:resourceId/assignments', getResourceAssignments);

// Update assignments (replace for a group)
router.put('/resources/:resourceId/assignments', updateResourceAssignments);

// Delete single assignment
router.delete('/resources/:resourceId/assignments/:assignmentId', deleteAssignment);

// Rename / update title of a resource
router.put('/resources/:resourceId', renameResource);

// Delete resource (soft or permanent)
router.delete('/resources/:resourceId', deleteResource);

// ====================
// Subscription Plans Management
// ====================
router.get('/subscription-plans', getSubscriptionPlans);
router.get('/subscription-plans/:id', getSubscriptionPlan);
router.post('/subscription-plans', createSubscriptionPlan);
router.put('/subscription-plans/:id', updateSubscriptionPlan);
router.delete('/subscription-plans/:id', deleteSubscriptionPlan);

// ====================
// Training Page Content Management
// ====================
router.get('/training-content/:lang', getContent);
router.put('/training-content/:lang', upsertContent);
// summer/winter/competitions program images
router.post('/training-content/programs/:trackId/:programIndex/images', upload.single('image'), uploadProgramImage);
router.delete('/training-content/programs/:trackId/:programIndex/images/:publicId', deleteProgramImage);
// yearRound department cover
router.post('/training-content/departments/:deptIndex/cover', upload.single('image'), uploadDepartmentCover);
router.delete('/training-content/departments/:deptIndex/cover', deleteDepartmentCover);
// yearRound department program images
router.post('/training-content/departments/:deptIndex/programs/:programIndex/images', upload.single('image'), uploadDeptProgramImage);
router.delete('/training-content/departments/:deptIndex/programs/:programIndex/images/:publicId', deleteDeptProgramImage);

module.exports = router;
