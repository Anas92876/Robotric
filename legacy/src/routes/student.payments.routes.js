const express = require('express');
const router = express.Router();
const { protect: authenticate } = require('../middleware/auth');
const {
  getCoursePayments,
  getAllPayments,
  getPaymentReceipt,
  initiatePayment,
  confirmPayment,
  getPaymentSummary
} = require('../controllers/student.payments.controller');

// All routes require authentication
router.use(authenticate);

// @route   GET /api/student/payments
router.get('/', getAllPayments);

// @route   GET /api/student/payments/summary
router.get('/summary', getPaymentSummary);

// @route   GET /api/student/payments/courses/:courseId
router.get('/courses/:courseId', getCoursePayments);

// @route   GET /api/student/payments/:paymentId/receipt
router.get('/:paymentId/receipt', getPaymentReceipt);

// @route   POST /api/student/payments/initiate
router.post('/initiate', initiatePayment);

// @route   POST /api/student/payments/:paymentId/confirm
router.post('/:paymentId/confirm', confirmPayment);

module.exports = router;
