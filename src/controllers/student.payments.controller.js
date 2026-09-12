const asyncHandler = require('../utils/asyncHandler');
const { AppError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');
const Receipt = require('../models/Receipt');
const Enrollment = require('../models/Enrollment');
const Payment = require('../models/Payment');
const { regenerateReceiptFromDB } = require('../utils/receiptGenerator');
const { sendNotificationToUser } = require('../services/notification.service');
const fs = require('fs');
const path = require('path');

// @desc    Get payment history for a course
// @route   GET /api/student/payments/courses/:courseId
// @access  Private (Student)
exports.getCoursePayments = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const studentId = req.user._id;

  // Check enrollment
  const enrollment = await Enrollment.findOne({
    student: studentId,
    course: courseId
  }).populate('course', 'title');

  if (!enrollment) {
    throw new AppError('You are not enrolled in this course', 403);
  }

  // Get payments (receipts) - both course and transportation
  const receipts = await Receipt.find({
    student: studentId,
    course: courseId
  })
    .populate('course', 'title')
    .populate('issuedBy', 'name')
    .sort({ createdAt: -1 });

  // Transform receipts to payment format
  const payments = receipts.map(receipt => ({
    _id: receipt._id,
    amount: receipt.payment.amount,
    paymentMethod: receipt.payment.method,
    transactionId: receipt.receiptNumber,
    status: 'completed',
    paidAt: receipt.payment.date,
    receipt: {
      receiptNumber: receipt.receiptNumber,
      receiptUrl: receipt.pdfPath,
      generatedAt: receipt.createdAt
    },
    notes: receipt.payment.notes,
    createdAt: receipt.createdAt,
    course: receipt.course,
    type: receipt.type || 'course' // Include receipt type (course or transportation)
  }));

  logger.info('Course payments retrieved', {
    studentId,
    courseId,
    paymentCount: payments.length
  });

  res.json({
    success: true,
    count: payments.length,
    data: payments
  });
});

// @desc    Get all payments for student
// @route   GET /api/student/payments
// @access  Private (Student)
exports.getAllPayments = asyncHandler(async (req, res) => {
  const studentId = req.user._id;

  // Get all receipts (payments) - both course and transportation
  const receipts = await Receipt.find({
    student: studentId
  })
    .populate('course', 'title')
    .populate('issuedBy', 'name')
    .sort({ createdAt: -1 });

  // Transform receipts to payment format
  const payments = receipts.map(receipt => ({
    _id: receipt._id,
    amount: receipt.payment.amount,
    paymentMethod: receipt.payment.method,
    transactionId: receipt.receiptNumber,
    status: 'completed',
    paidAt: receipt.payment.date,
    receipt: {
      receiptNumber: receipt.receiptNumber,
      receiptUrl: receipt.pdfPath,
      generatedAt: receipt.createdAt
    },
    notes: receipt.payment.notes,
    createdAt: receipt.createdAt,
    course: receipt.course,
    type: receipt.type || 'course' // Include receipt type
  }));

  logger.info('All payments retrieved', {
    studentId,
    paymentCount: payments.length
  });

  res.json({
    success: true,
    count: payments.length,
    data: payments
  });
});

// @desc    Get payment receipt (Download PDF)
// @route   GET /api/student/payments/:paymentId/receipt
// @access  Private (Student)
exports.getPaymentReceipt = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;
  const studentId = req.user._id;

  // Get receipt with populated data (needed for regeneration)
  const receipt = await Receipt.findOne({
    _id: paymentId,
    student: studentId
  })
    .populate('student', 'name email')
    .populate('course', 'title')
    .populate('enrollment', 'notes')
    .populate('issuedBy', 'name');

  if (!receipt) {
    throw new NotFoundError('Receipt');
  }

  if (!receipt.pdfPath) {
    throw new NotFoundError('Receipt PDF');
  }

  // Construct file path
  const filePath = path.join(__dirname, '../../', receipt.pdfPath);

  // Check if file exists - if not, regenerate from DB
  if (!fs.existsSync(filePath)) {
    logger.info(`PDF file not found for receipt ${receipt.receiptNumber}, regenerating...`, {
      context: 'receipt_regeneration',
      receiptId: paymentId,
      receiptNumber: receipt.receiptNumber,
      pdfPath: receipt.pdfPath,
      filePath
    });

    try {
      // Ensure uploads directory exists
      const uploadsDir = path.dirname(filePath);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Regenerate PDF from DB data
      await regenerateReceiptFromDB(receipt, filePath);
      
      logger.info(`PDF regenerated successfully for receipt ${receipt.receiptNumber}`, {
        context: 'receipt_regeneration_success',
        receiptId: paymentId,
        receiptNumber: receipt.receiptNumber
      });
    } catch (regenerateError) {
      logger.logError(regenerateError, {
        context: 'receipt_regeneration_error',
        receiptId: paymentId,
        receiptNumber: receipt.receiptNumber,
        filePath
      });
      throw new AppError('Error regenerating receipt PDF', 500, 'PDF_REGENERATION_ERROR');
    }
  }

  logger.info('Receipt downloaded', {
    studentId,
    receiptId: paymentId,
    receiptNumber: receipt.receiptNumber
  });

  // Send PDF file with proper error handling
  // Wrap res.download in a Promise to work with asyncHandler
  return new Promise((resolve, reject) => {
    res.download(filePath, `${receipt.receiptNumber}.pdf`, (err) => {
      if (err) {
        // Don't throw if headers already sent (download started)
        if (res.headersSent) {
          logger.logError(err, {
            context: 'receipt_download_stream_error',
            receiptId: paymentId,
            filePath
          });
          return resolve(); // Download started but failed mid-stream
        }
        
        logger.logError(err, {
          context: 'receipt_download_error',
          receiptId: paymentId,
          filePath
        });
        reject(new AppError('Error downloading receipt file', 500, 'FILE_DOWNLOAD_ERROR'));
      } else {
        resolve();
      }
    });
  });
});

// @desc    Initiate a payment
// @route   POST /api/student/payments/initiate
// @access  Private (Student)
exports.initiatePayment = asyncHandler(async (req, res) => {
  const studentId = req.user._id;
  const { enrollmentId, amount, paymentMethod, installmentNumber } = req.body;

  if (!enrollmentId || !amount || !paymentMethod) {
    throw new AppError('Enrollment ID, amount, and payment method are required', 400);
  }

  // Get enrollment
  const enrollment = await Enrollment.findOne({
    _id: enrollmentId,
    student: studentId
  });

  if (!enrollment) {
    throw new AppError('Enrollment not found', 404);
  }

  // Validate amount
  if (amount <= 0) {
    throw new AppError('Invalid amount', 400);
  }

  if (amount > enrollment.payment.remainingAmount) {
    throw new AppError('Amount exceeds remaining balance', 400);
  }

  // Create payment record
  const payment = await Payment.create({
    student: studentId,
    enrollment: enrollmentId,
    course: enrollment.course,
    amount,
    paymentMethod,
    status: 'pending',
    installmentNumber: installmentNumber || null
  });

  logger.info('Payment initiated', {
    studentId,
    enrollmentId,
    paymentId: payment._id,
    amount
  });

  res.status(201).json({
    success: true,
    message: 'Payment initiated. Please complete the payment process.',
    data: payment
  });
});

// @desc    Confirm payment (after external payment gateway)
// @route   POST /api/student/payments/:paymentId/confirm
// @access  Private (Student)
exports.confirmPayment = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;
  const studentId = req.user._id;
  const { transactionId } = req.body;

  const payment = await Payment.findOne({
    _id: paymentId,
    student: studentId,
    status: 'pending'
  });

  if (!payment) {
    throw new AppError('Payment not found or already processed', 404);
  }

  // Update payment
  payment.transactionId = transactionId;
  payment.markAsCompleted();
  await payment.save();

  // Update enrollment
  const enrollment = await Enrollment.findById(payment.enrollment)
    .populate('course', 'title');
  enrollment.payment.paidAmount += payment.amount;
  enrollment.payment.remainingAmount = enrollment.payment.totalAmount - enrollment.payment.paidAmount;

  // Update installment status if applicable
  if (payment.installmentNumber) {
    const installment = enrollment.payment.installments.find(
      inst => inst._id.toString() === payment.installmentNumber.toString()
    );
    if (installment) {
      installment.status = 'paid';
      installment.paidDate = new Date();
      installment.paymentId = payment._id;
    }
  }

  await enrollment.save();

  logger.info('Payment confirmed', {
    studentId,
    paymentId,
    amount: payment.amount,
    transactionId
  });

  // Send notification to student about payment confirmation
  try {
    const formattedAmount = `${payment.amount.toLocaleString()} S.P.`;
    const courseTitle = enrollment.course?.title || 'your course';
    const notificationBody = `Your payment of ${formattedAmount} for ${courseTitle} has been confirmed`;
    
    await sendNotificationToUser(
      studentId,
      'Payment Confirmed',
      notificationBody,
      {
        type: 'payment_confirmed',
        paymentId: payment._id.toString(),
        enrollmentId: enrollment._id.toString(),
        courseId: enrollment.course?._id?.toString() || null,
        amount: payment.amount,
        screen: 'payments'
      }
    );
    
    logger.info(`Payment confirmation notification sent to student ${studentId}`, {
      paymentId: payment._id,
      amount: payment.amount
    });
  } catch (notificationError) {
    // Log but don't fail the request
    logger.error(`Failed to send payment confirmation notification: ${notificationError.message}`, {
      paymentId: payment._id,
      error: notificationError
    });
  }

  res.json({
    success: true,
    message: 'Payment confirmed successfully',
    data: {
      payment,
      enrollment: {
        totalAmount: enrollment.payment.totalAmount,
        paidAmount: enrollment.payment.paidAmount,
        remainingAmount: enrollment.payment.remainingAmount
      }
    }
  });
});

// @desc    Get payment summary
// @route   GET /api/student/payments/summary
// @access  Private (Student)
exports.getPaymentSummary = asyncHandler(async (req, res) => {
  const studentId = req.user._id;

  // Get all enrollments
  const enrollments = await Enrollment.find({
    student: studentId
  }).populate('course', 'title');

  // Get all receipts (completed payments)
  const receipts = await Receipt.find({
    student: studentId
  });

  // Calculate summary matching frontend PaymentSummary interface
  const summary = {
    totalAmount: 0,
    paidAmount: 0,
    remainingAmount: 0,
    totalPayments: receipts.length,
    completedPayments: receipts.length, // All receipts are completed payments
    pendingPayments: 0,
    overduePayments: 0,
    nextPaymentDue: null,
    // Transportation summary
    transportationTotal: 0,
    transportationPaid: 0,
    transportationRemaining: 0,
    transportationPendingPayments: 0,
    transportationOverduePayments: 0,
    transportationNextPaymentDue: null
  };

  const now = new Date();
  let earliestDue = null;
  let earliestTransportationDue = null;

  enrollments.forEach(enrollment => {
    // Course payment summary
    summary.totalAmount += enrollment.payment.totalAmount || 0;
    summary.paidAmount += enrollment.payment.paidAmount || 0;
    summary.remainingAmount += enrollment.payment.remainingAmount || 0;

    // Count pending installments
    if (enrollment.payment.installments && enrollment.payment.installments.length > 0) {
      enrollment.payment.installments.forEach(inst => {
        if (inst.status === 'pending') {
          summary.pendingPayments++;

          // Check if overdue
          if (new Date(inst.dueDate) < now) {
            summary.overduePayments++;
          }

          // Find earliest due date for next payment
          if (!earliestDue || new Date(inst.dueDate) < new Date(earliestDue.dueDate)) {
            earliestDue = {
              amount: inst.amount,
              dueDate: inst.dueDate,
              isOverdue: new Date(inst.dueDate) < now
            };
          }
        }
      });
    }

    // Transportation payment summary
    if (enrollment.transportation && enrollment.transportation.enabled) {
      summary.transportationTotal += enrollment.transportation.totalAmount || 0;
      summary.transportationPaid += enrollment.transportation.paidAmount || 0;
      summary.transportationRemaining += enrollment.transportation.remainingAmount || 0;

      // Count pending transportation installments
      if (enrollment.transportation.installments && enrollment.transportation.installments.length > 0) {
        enrollment.transportation.installments.forEach(inst => {
          if (inst.status === 'pending') {
            summary.transportationPendingPayments++;

            // Check if overdue
            if (new Date(inst.dueDate) < now) {
              summary.transportationOverduePayments++;
            }

            // Find earliest due date for next transportation payment
            if (!earliestTransportationDue || new Date(inst.dueDate) < new Date(earliestTransportationDue.dueDate)) {
              earliestTransportationDue = {
                amount: inst.amount,
                dueDate: inst.dueDate,
                isOverdue: new Date(inst.dueDate) < now
              };
            }
          }
        });
      }
    }
  });

  summary.nextPaymentDue = earliestDue;
  summary.transportationNextPaymentDue = earliestTransportationDue;

  logger.info('Payment summary retrieved', {
    studentId,
    totalAmount: summary.totalAmount,
    paidAmount: summary.paidAmount,
    remainingAmount: summary.remainingAmount
  });

  res.json({
    success: true,
    data: summary
  });
});

module.exports = exports;
