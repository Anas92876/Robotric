const express = require('express');
const {
  getDashboardStats,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getRecentEnrollments,
  getRecentActivities
} = require('../controllers/reception.controller');
const {
  getAllEnrollments,
  getEnrollmentById,
  createEnrollment,
  updateEnrollment,
  updateEnrollmentStatus,
  deleteEnrollment,
  recordPayment,
  recordTransportationPayment,
  getTransportationReceipts,
  markOverdueTransportationInstallments,
  deleteTransportation,
  getAvailableCourses,
  getAvailableGroups,
  getAvailableStudents,
  checkEnrollment,
  enrollFromWaiting,
  enrollInBundle,
  getSubEnrollments
} = require('../controllers/reception.enrollment.controller');
const {
  getAllLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  convertToStudent,
  addFollowUp,
  getLeadStats,
  changeLeadStatus,
  setLeadWaiting,
  getWaitingLeads
} = require('../controllers/reception.lead.controller');
const {
  createReceipt,
  getReceipt,
  downloadReceipt,
  getEnrollmentReceipts,
  regenerateAllReceipts
} = require('../controllers/receipt.controller');
const {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent
} = require('../controllers/reception.event.controller');
const {
  getContactHistoryByLead,
  createContactHistory,
  updateContactHistory,
  deleteContactHistory,
  getContactHistoryStats
} = require('../controllers/reception.contacthistory.controller');
const { getAllInterests } = require('../controllers/clo.interests.controller');
const {
  getAllSessionRequests,
  approveSessionRequest,
  declineSessionRequest,
  createSessionReport,
  getAllSessionReports
} = require('../controllers/reception.subscriptions.controller');
const {
  getActiveSubscriptionPlans,
  getUserSubscriptions,
  createUserSubscription,
  updateUserSubscription,
  cancelUserSubscription
} = require('../controllers/reception.userSubscriptions.controller');
const {
  getAllContacts,
  getContactById,
  updateContact,
  deleteContact
} = require('../controllers/contact.controller');
const {
  getAllApplications,
  getApplicationById,
  updateApplication,
  deleteApplication,
  downloadCv
} = require('../controllers/job.application.controller');
const { sendCustomNotification } = require('../controllers/notifications.controller');
const { protect, requireReception } = require('../middleware/auth');
const pdfUpload = require('../middleware/pdf-upload');
const { validate } = require('../middleware/validate');
const { createUserSchema, updateUserSchema } = require('../validations/reception.validations');
const { updateContactSchema } = require('../validations/contact.validations');

const router = express.Router();

// All routes require authentication and reception role
router.use(protect);
router.use(requireReception);

// Dashboard
router.get('/dashboard', getDashboardStats);
router.get('/recent-enrollments', getRecentEnrollments);
router.get('/recent-activities', getRecentActivities);

// User management
router.route('/users')
  .get(getAllUsers)
  .post(validate(createUserSchema), createUser);

router.route('/users/:id')
  .put(validate(updateUserSchema), updateUser)
  .delete(deleteUser);

// Helper endpoints for enrollment form (must come BEFORE :id route)
router.get('/enrollments/available-courses', getAvailableCourses);
router.get('/enrollments/available-groups/:courseId', getAvailableGroups);
router.get('/enrollments/available-students', getAvailableStudents);
router.get('/enrollments/check', checkEnrollment);
router.post('/enrollments/from-waiting', enrollFromWaiting);
router.post('/enrollments/bundle', enrollInBundle);
router.get('/enrollments/:enrollmentId/sub-enrollments', getSubEnrollments);

// Enrollment management
router.route('/enrollments')
  .get(getAllEnrollments)
  .post(createEnrollment);

router.route('/enrollments/:id')
  .get(getEnrollmentById)
  .put(updateEnrollment)
  .delete(deleteEnrollment);

router.put('/enrollments/:id/status', updateEnrollmentStatus);
router.post('/enrollments/:id/payment', recordPayment);
router.post('/enrollments/:id/transportation-payment', recordTransportationPayment);
router.get('/enrollments/:id/transportation-receipts', getTransportationReceipts);
router.delete('/enrollments/:id/transportation', deleteTransportation);
router.post('/enrollments/mark-overdue-transportation', markOverdueTransportationInstallments);

// Interests (for lead form)
router.get('/interests', getAllInterests);

// Lead management (helper endpoints first — all must come BEFORE :id)
router.get('/leads/stats', getLeadStats);
router.get('/leads/waiting', getWaitingLeads);

router.route('/leads')
  .get(getAllLeads)
  .post(createLead);

router.route('/leads/:id')
  .get(getLeadById)
  .put(updateLead)
  .delete(deleteLead);

router.post('/leads/:id/convert', convertToStudent);
router.post('/leads/:id/follow-up', addFollowUp);
router.post('/leads/:id/change-status', changeLeadStatus);
router.post('/leads/:id/set-waiting', setLeadWaiting);

// Contact History management (helper endpoints first)
router.get('/contact-history/stats', getContactHistoryStats);

router.route('/leads/:leadId/contact-history')
  .get(getContactHistoryByLead)
  .post(createContactHistory);

router.route('/contact-history/:id')
  .put(updateContactHistory)
  .delete(deleteContactHistory);

// Receipt management (helper endpoints first)
router.get('/receipts/enrollment/:enrollmentId', getEnrollmentReceipts);

router.route('/receipts')
  .post(createReceipt);

router.route('/receipts/:id')
  .get(getReceipt);

router.get('/receipts/:id/download', downloadReceipt);

// Event management
router.route('/events')
  .get(getEvents)
  .post(createEvent);

router.route('/events/:id')
  .put(updateEvent)
  .delete(deleteEvent);

// Subscription session management
router.get('/session-requests', getAllSessionRequests);
router.post('/session-requests/:id/approve', approveSessionRequest);
router.post('/session-requests/:id/decline', declineSessionRequest);
router.post('/session-requests/:id/report', pdfUpload.single('pdf'), createSessionReport);
router.get('/session-reports', getAllSessionReports);

// User subscription management
router.get('/subscription-plans/active', getActiveSubscriptionPlans);
router.get('/user-subscriptions', getUserSubscriptions);
router.post('/user-subscriptions', createUserSubscription);
router.put('/user-subscriptions/:id', updateUserSubscription);
router.post('/user-subscriptions/:id/cancel', cancelUserSubscription);

// Notification management
router.post('/notifications/send', sendCustomNotification);

// Contact form submissions management
router.route('/contacts')
  .get(getAllContacts);

router.route('/contacts/:id')
  .get(getContactById)
  .put(validate(updateContactSchema), updateContact)
  .delete(deleteContact);

// Job Applications management
router.route('/job-applications')
  .get(getAllApplications);

router.route('/job-applications/:id')
  .get(getApplicationById)
  .put(updateApplication)
  .delete(deleteApplication);

router.get('/job-applications/:id/cv', downloadCv);

module.exports = router;
