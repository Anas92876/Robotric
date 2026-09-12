/**
 * Reception Enrollment Controller
 *
 * Handles enrollment operations for reception staff:
 * - Create new enrollments (register students in courses)
 * - View all enrollments with filters
 * - Update enrollment status
 * - Set up payment plans with installments
 */

const Enrollment = require('../models/Enrollment');
const { parsePagination } = require('../utils/http');
const Course = require('../models/Course');
const User = require('../models/User');
const Group = require('../models/Group');
const logger = require('../utils/logger');
const { sendNotificationToUser, checkAndSendPaymentReminder } = require('../services/notification.service');
const { createAndEmitNotification } = require('../services/webNotification.service');

/**
 * @desc    Get all enrollments with filters
 * @route   GET /api/reception/enrollments
 * @access  Private/Reception
 */
const getAllEnrollments = async (req, res) => {
  try {
    const { course, student, status, paymentStatus, hasDiscount, transportationFilter } = req.query;
    const { page: safePage, limit: safeLimit, skip } = parsePagination(req.query);

    // Build query
    const query = {};
    if (course) query.course = course;
    if (status) query.status = status;

    // Always exclude bundle sub-course enrollments from the main list.
    // They have enrollmentSource='bundle' and payment.totalAmount=0.
    // Reception sees them only by expanding the parent bundle enrollment row.
    query.enrollmentSource = { $ne: 'bundle' };

    // Student search by name or email
    if (student) {
      // Find students matching the search term
      const matchingStudents = await User.find({
        role: 'student',
        $or: [
          { name: { $regex: student, $options: 'i' } },
          { email: { $regex: student, $options: 'i' } }
        ]
      }).select('_id');

      // Extract student IDs
      const studentIds = matchingStudents.map(s => s._id);

      // If no students found, return empty result
      if (studentIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: {
            page: safePage,
            limit: safeLimit,
            total: 0,
            pages: 0
          }
        });
      }

      // Add to query
      query.student = { $in: studentIds };
    }

    // Payment Status Filter
    if (paymentStatus) {
      if (paymentStatus === 'paid') {
        query['payment.remainingAmount'] = 0;
      } else if (paymentStatus === 'unpaid') {
        query['payment.paidAmount'] = 0;
      } else if (paymentStatus === 'partial') {
        query['payment.paidAmount'] = { $gt: 0 };
        query['payment.remainingAmount'] = { $gt: 0 };
      }
    }

    // Discount Filter
    if (hasDiscount) {
      if (hasDiscount === 'true') {
        query['payment.discount'] = { $gt: 0 };
      } else if (hasDiscount === 'false') {
        query['payment.discount'] = { $in: [0, null, undefined] };
      }
    }

    // Transportation Filter
    if (transportationFilter) {
      if (transportationFilter === 'enabled') {
        query['transportation.enabled'] = true;
      } else if (transportationFilter === 'disabled') {
        query['$or'] = [
          { 'transportation.enabled': false },
          { 'transportation': { $exists: false } },
          { 'transportation.enabled': { $exists: false } }
        ];
      } else if (transportationFilter === 'paid') {
        query['transportation.enabled'] = true;
        query['transportation.remainingAmount'] = 0;
      } else if (transportationFilter === 'pending') {
        query['transportation.enabled'] = true;
        query['transportation.remainingAmount'] = { $gt: 0 };
      }
    }

    // Fetch enrollments with populated fields
    const enrollments = await Enrollment.find(query)
      .populate('student', 'name email')
      .populate('course', 'title price type bundlePrice')
      .sort({ enrolledAt: -1 })
      .skip(skip)
      .limit(safeLimit);

    const total = await Enrollment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: enrollments,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit)
      }
    });
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching enrollments',
    });
  }
};

/**
 * @desc    Get single enrollment by ID
 * @route   GET /api/reception/enrollments/:id
 * @access  Private/Reception
 */
const getEnrollmentById = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch enrollment with populated fields
    const enrollment = await Enrollment.findById(id)
      .populate('student', 'name email')
      .populate('course', 'title price');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    console.error('Error fetching enrollment:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching enrollment',
    });
  }
};

/**
 * @desc    Create new enrollment
 * @route   POST /api/reception/enrollments
 * @access  Private/Reception
 */
const createEnrollment = async (req, res) => {
  try {
    const { 
      studentId, 
      courseId, 
      groupId, 
      installmentPlan, 
      notes, 
      discount = 0,
      transportation
    } = req.body;

    // Validate required fields
    if (!studentId || !courseId) {
       return res.status(400).json({
          success: false,
          message: 'Student and course are required'
       });
    }

    // Check if student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Calculate total amount with discount
    const discountPercent = Math.min(Math.max(parseFloat(discount) || 0, 0), 100);
    
    let totalAmount = course.price;
    if (discountPercent > 0) {
      totalAmount = totalAmount - (totalAmount * (discountPercent / 100));
    }
    totalAmount = Math.round(totalAmount * 100) / 100;

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
      status: { $in: ['active', 'completed'] }
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Student is already enrolled in this course'
      });
    }

    // Create installment schedule
    let installments = [];
    
    // Check if custom installments are provided
    if (req.body.installments && Array.isArray(req.body.installments) && req.body.installments.length > 0) {
      installments = req.body.installments.map(inst => ({
        amount: parseFloat(inst.amount),
        dueDate: new Date(inst.dueDate),
        status: 'pending'
      }));
    } 
    // Otherwise fallback to auto-generation if installmentPlan is provided
    else if (installmentPlan && installmentPlan.numberOfInstallments > 0) {
      const installmentAmount = totalAmount / installmentPlan.numberOfInstallments;
      const startDate = installmentPlan.startDate ? new Date(installmentPlan.startDate) : new Date();

      for (let i = 0; i < installmentPlan.numberOfInstallments; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        installments.push({
          amount: Math.round(installmentAmount * 100) / 100, // Round to 2 decimals
          dueDate,
          status: 'pending'
        });
      }
    } else {
      // Single payment (implicit if no plan)
      // Only if totalAmount is not fully paid (conceptually), but here we just default to one installment
      // However, if the user intends to pay fully now, they might send empty installments.
      // Logic: If no installments provided and no plan -> 1 installment of totalAmount
      installments.push({
        amount: totalAmount,
        dueDate: new Date(),
        status: 'pending'
      });
    }

    // Process transportation if provided
    let transportationData = {
      enabled: false,
      totalAmount: 0,
      paidAmount: 0,
      remainingAmount: 0,
      installments: []
    };

    if (transportation && transportation.enabled) {
      const transportTotal = parseFloat(transportation.totalAmount) || 0;
      const transportPaid = parseFloat(transportation.paidNow) || 0;
      const transportRemaining = Math.max(0, transportTotal - transportPaid);

      // Process transportation installments
      let transportInstallments = [];
      if (transportation.installments && Array.isArray(transportation.installments) && transportation.installments.length > 0) {
        transportInstallments = transportation.installments.map(inst => ({
          amount: parseFloat(inst.amount),
          dueDate: new Date(inst.dueDate),
          status: 'pending'
        }));
      } else if (transportRemaining > 0) {
        // Single installment for remaining amount
        transportInstallments.push({
          amount: transportRemaining,
          dueDate: new Date(),
          status: 'pending'
        });
      }

      transportationData = {
        enabled: true,
        totalAmount: transportTotal,
        paidAmount: transportPaid,
        remainingAmount: transportRemaining,
        installments: transportInstallments
      };
    }

    // Create enrollment
    const enrollment = await Enrollment.create({
      student: studentId,
      course: courseId,
      payment: {
        totalAmount,
        paidAmount: 0,
        remainingAmount: totalAmount,
        discount: discountPercent,
        installments
      },
      transportation: transportationData,
      notes: notes || ''
    });

    // Add student to group if specified
    if (groupId) {
      const group = await Group.findById(groupId);
      if (group) {
        if (!group.students.includes(studentId)) {
          group.students.push(studentId);
          await group.save();
        }
      }
    }

    // Populate and return
    const populatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate('student', 'name email')
      .populate('course', 'title price');

    // Create web notification for student
    try {
      await createAndEmitNotification(
        studentId,
        'enrollment',
        'New Enrollment Created',
        `You have been enrolled in ${course.title}. Total amount: ${totalAmount.toLocaleString()} S.P.`,
        {
          enrollmentId: enrollment._id.toString(),
          courseId: courseId.toString(),
          courseTitle: course.title,
          totalAmount
        },
        {
          actionUrl: `/student/courses`,
          actionLabel: 'View Course'
        }
      );
    } catch (notifError) {
      logger.error(`Failed to create enrollment notification: ${notifError.message}`, {
        enrollmentId: enrollment._id,
        studentId
      });
    }

    // Check and send payment reminders for installments due soon
    try {
      // Check course payment installments
      if (populatedEnrollment.payment.installments && populatedEnrollment.payment.installments.length > 0) {
        for (const installment of populatedEnrollment.payment.installments) {
          if (installment.status === 'pending') {
            await checkAndSendPaymentReminder(populatedEnrollment, installment, 'course');
          }
        }
      }

      // Check transportation payment installments
      if (populatedEnrollment.transportation?.enabled && 
          populatedEnrollment.transportation.installments && 
          populatedEnrollment.transportation.installments.length > 0) {
        for (const installment of populatedEnrollment.transportation.installments) {
          if (installment.status === 'pending') {
            await checkAndSendPaymentReminder(populatedEnrollment, installment, 'transportation');
          }
        }
      }
    } catch (reminderError) {
      // Log but don't fail the request
      logger.error(`Failed to send payment reminders during enrollment creation: ${reminderError.message}`, {
        enrollmentId: enrollment._id,
        error: reminderError
      });
    }

    res.status(201).json({
      success: true,
      message: 'Enrollment created successfully',
      data: populatedEnrollment
    });
  } catch (error) {
    console.error('Error creating enrollment:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating enrollment',
    });
  }
};

/**
 * @desc    Update enrollment
 * @route   PUT /api/reception/enrollments/:id
 * @access  Private/Reception
 */
const updateEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, transportation } = req.body;

    const enrollment = await Enrollment.findById(id);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Track if transportation was disabled before update (for receipt generation)
    const wasTransportationDisabled = !enrollment.transportation || !enrollment.transportation.enabled;

    // Update fields
    if (status) enrollment.status = status;
    if (notes !== undefined) enrollment.notes = notes;

    // Update transportation if provided
    if (transportation !== undefined) {
      // If transportation is being disabled
      if (transportation.enabled === false) {
        enrollment.transportation.enabled = false;
      } 
      // If transportation is being enabled or updated
      else if (transportation.enabled === true) {
        // Initialize transportation if it doesn't exist
        if (!enrollment.transportation) {
          enrollment.transportation = {
            enabled: false,
            totalAmount: 0,
            paidAmount: 0,
            remainingAmount: 0,
            installments: []
          };
        }

        enrollment.transportation.enabled = true;

        // Update totalAmount if provided and valid
        if (transportation.totalAmount !== undefined) {
          const newTotal = parseFloat(transportation.totalAmount);
          if (newTotal >= 0) {
            // Ensure new total is not less than already paid amount
            if (newTotal < enrollment.transportation.paidAmount) {
              return res.status(400).json({
                success: false,
                message: `New transportation total (${newTotal.toLocaleString()} S.P.) cannot be less than already paid amount (${enrollment.transportation.paidAmount.toLocaleString()} S.P.)`
              });
            }
            enrollment.transportation.totalAmount = newTotal;
            enrollment.transportation.remainingAmount = newTotal - enrollment.transportation.paidAmount;
          }
        }

        // Update paidAmount if paidNow is provided
        if (transportation.paidNow !== undefined) {
          const paidNow = parseFloat(transportation.paidNow);
          if (paidNow < 0) {
            return res.status(400).json({
              success: false,
              message: 'Paid amount cannot be negative'
            });
          }
          
          // Ensure totalAmount is set before validating paidNow
          const currentTotal = enrollment.transportation.totalAmount || 0;
          if (paidNow > currentTotal) {
            return res.status(400).json({
              success: false,
              message: `Paid amount (${paidNow.toLocaleString()} S.P.) cannot exceed total amount (${currentTotal.toLocaleString()} S.P.)`
            });
          }

          enrollment.transportation.paidAmount = paidNow;
          enrollment.transportation.remainingAmount = enrollment.transportation.totalAmount - paidNow;
        }

        // Update installments if provided
        if (transportation.installments && Array.isArray(transportation.installments)) {
          const transportRemaining = enrollment.transportation.totalAmount - enrollment.transportation.paidAmount;
          
          // Only update installments if there's remaining balance
          if (transportRemaining > 0.01) {
            enrollment.transportation.installments = transportation.installments.map(inst => ({
              amount: parseFloat(inst.amount),
              dueDate: new Date(inst.dueDate),
              status: 'pending',
              paidDate: null,
              paymentId: null
            }));
          } else {
            enrollment.transportation.installments = [];
          }
        }
      }
    }

    // If status is completed, set completedAt
    if (status === 'completed' && !enrollment.completedAt) {
      enrollment.completedAt = new Date();
    }

    // Check if transportation is being newly enabled (for receipt generation)
    // Note: wasTransportationDisabled was already declared at the beginning of the function
    const transportationJustEnabled = transportation !== undefined && 
                                      transportation.enabled === true && 
                                      wasTransportationDisabled;

    await enrollment.save();

    // Create web notification if status changed
    if (status && status !== enrollment.status) {
      try {
        const populatedEnrollment = await Enrollment.findById(enrollment._id)
          .populate('student', 'name email')
          .populate('course', 'title price');

        await createAndEmitNotification(
          enrollment.student,
          'enrollment',
          'Enrollment Status Updated',
          `Your enrollment in ${populatedEnrollment.course.title} has been updated to ${status}.`,
          {
            enrollmentId: enrollment._id.toString(),
            courseId: enrollment.course.toString(),
            status
          },
          {
            actionUrl: `/student/courses`,
            actionLabel: 'View Enrollment'
          }
        );
      } catch (notifError) {
        logger.error(`Failed to create status update notification: ${notifError.message}`, {
          enrollmentId: enrollment._id
        });
      }
    }

    // ========== AUTO-GENERATE TRANSPORTATION RECEIPT IF ADDED WITH PAYMENT ==========
    if (transportationJustEnabled && 
        transportation.paidNow !== undefined && 
        parseFloat(transportation.paidNow) > 0) {
      
      const Receipt = require('../models/Receipt');
      const { generateReceipt } = require('../utils/receiptGenerator');
      const path = require('path');
      const fs = require('fs');

      try {
        // Reload enrollment with populated fields for receipt generation
        const enrollmentForReceipt = await Enrollment.findById(enrollment._id)
          .populate('student', 'name email')
          .populate('course', 'title price');

        if (!enrollmentForReceipt || !enrollmentForReceipt.transportation || !enrollmentForReceipt.transportation.enabled) {
          throw new Error('Enrollment or transportation not found after save');
        }

        const paidAmount = parseFloat(transportation.paidNow);
        
        // Generate unique receipt number
        const receiptNumber = await Receipt.generateReceiptNumber();

        // Calculate billing info for transportation
        const billing = {
          totalAmount: enrollmentForReceipt.transportation.totalAmount,
          paidBefore: 0, // This is the first payment
          paidNow: paidAmount,
          remainingBalance: enrollmentForReceipt.transportation.remainingAmount
        };

        // Prepare receipt data
        const pdfReceiptData = {
          receiptNumber,
          student: {
            name: enrollmentForReceipt.student.name,
            email: enrollmentForReceipt.student.email
          },
          course: {
            title: enrollmentForReceipt.course.title
          },
          payment: {
            amount: paidAmount,
            method: transportation.paymentMethod || 'cash',
            date: new Date(),
            notes: transportation.notes || ''
          },
          billing,
          enrollmentNotes: enrollmentForReceipt.notes || '',
          issuedBy: {
            name: req.user.name
          },
          type: 'transportation'
        };

        // Generate PDF
        const fileName = `TRANS-${receiptNumber}.pdf`;
        const uploadsDir = path.join(__dirname, '../../uploads/receipts');

        // Ensure uploads directory exists
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const pdfPath = path.join(uploadsDir, fileName);
        await generateReceipt(pdfReceiptData, pdfPath);

        // Save receipt to database
        await Receipt.create({
          receiptNumber,
          enrollment: enrollmentForReceipt._id,
          student: enrollmentForReceipt.student._id,
          course: enrollmentForReceipt.course._id,
          payment: {
            amount: paidAmount,
            method: transportation.paymentMethod || 'cash',
            date: new Date(),
            notes: transportation.notes || ''
          },
          billing,
          pdfPath: `uploads/receipts/${fileName}`,
          issuedBy: req.user.id,
          type: 'transportation'
        });

        console.log(`Transportation receipt ${receiptNumber} generated successfully for enrollment ${enrollment._id}`);
      } catch (receiptError) {
        // Log error but don't fail the enrollment update
        console.error('Error generating transportation receipt:', receiptError);
        // Continue with enrollment update response
      }
    }

    const populatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate('student', 'name email')
      .populate('course', 'title price');

    // Check and send payment reminders for installments due soon
    try {
      // Check course payment installments
      if (populatedEnrollment.payment.installments && populatedEnrollment.payment.installments.length > 0) {
        for (const installment of populatedEnrollment.payment.installments) {
          if (installment.status === 'pending') {
            await checkAndSendPaymentReminder(populatedEnrollment, installment, 'course');
          }
        }
      }

      // Check transportation payment installments
      if (populatedEnrollment.transportation?.enabled && 
          populatedEnrollment.transportation.installments && 
          populatedEnrollment.transportation.installments.length > 0) {
        for (const installment of populatedEnrollment.transportation.installments) {
          if (installment.status === 'pending') {
            await checkAndSendPaymentReminder(populatedEnrollment, installment, 'transportation');
          }
        }
      }
    } catch (reminderError) {
      // Log but don't fail the request
      logger.error(`Failed to send payment reminders during enrollment update: ${reminderError.message}`, {
        enrollmentId: enrollment._id,
        error: reminderError
      });
    }

    res.status(200).json({
      success: true,
      message: 'Enrollment updated successfully',
      data: populatedEnrollment
    });
  } catch (error) {
    console.error('Error updating enrollment:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating enrollment',
    });
  }
};

/**
 * @desc    Record a payment for an enrollment
 * @route   POST /api/reception/enrollments/:id/payment
 * @access  Private/Reception
 */
const recordPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, notes, paymentCurrency, amountInSP } = req.body;

    // parseFloat accepts "12abc" as 12 and " " as NaN; validate the parsed
    // number rather than the raw input.
    const paymentAmount = parseFloat(amount);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid payment amount is required'
      });
    }

    // This used to read the enrollment, compute paidAmount + amount in Node,
    // check it against the total, then write the result back. Two payments
    // recorded at the same time both read the same starting balance and the
    // second write silently overwrote the first, losing a payment.
    //
    // The balance check now lives in the query filter, so MongoDB evaluates it
    // against the stored document at write time and applies the increment
    // atomically. A concurrent second payment either fits (and is applied on
    // top) or matches nothing (and is rejected).
    //
    // remainingAmount is decremented in the same operation: the pre('save')
    // hook that normally derives it does not run for findOneAndUpdate, and
    // keeping both in one atomic update is what makes them agree.
    const now = new Date();
    const enrollment = await Enrollment.findOneAndUpdate(
      {
        _id: id,
        $expr: {
          $lte: [
            { $add: ['$payment.paidAmount', paymentAmount] },
            '$payment.totalAmount'
          ]
        }
      },
      {
        $inc: {
          'payment.paidAmount': paymentAmount,
          'payment.remainingAmount': -paymentAmount
        },
        $set: { 'payment.lastPaymentDate': now },
        $push: {
          'payment.paymentHistory': {
            amount: paymentAmount,
            date: now,
            method: paymentMethod || 'cash',
            notes: notes || '',
            receivedBy: req.user.id
          }
        }
      },
      { new: true }
    )
      .populate('student', 'name email')
      .populate('course', 'title price');

    if (!enrollment) {
      // Nothing matched: either the enrollment is gone, or this payment would
      // push the balance past the total. Distinguish the two for the caller.
      const existing = await Enrollment.findById(id).select('payment.remainingAmount').lean();
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Enrollment not found'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Payment amount exceeds remaining balance. Remaining: ${existing.payment.remainingAmount}`
      });
    }

    // Create web notification for payment
    try {
      await createAndEmitNotification(
        enrollment.student._id || enrollment.student,
        'payment',
        'Payment Received',
        `Payment of ${parseFloat(amount).toLocaleString()} S.P. has been recorded for ${enrollment.course.title}. Remaining balance: ${enrollment.payment.remainingAmount.toLocaleString()} S.P.`,
        {
          enrollmentId: enrollment._id.toString(),
          courseId: enrollment.course._id?.toString() || enrollment.course.toString(),
          amount: parseFloat(amount),
          remainingAmount: enrollment.payment.remainingAmount
        },
        {
          actionUrl: `/student/payments`,
          actionLabel: 'View Payments'
        }
      );
    } catch (notifError) {
      logger.error(`Failed to create payment notification: ${notifError.message}`, {
        enrollmentId: enrollment._id
      });
    }

    // ========== AUTO-GENERATE RECEIPT ==========
    const Receipt = require('../models/Receipt');
    const { generateReceipt } = require('../utils/receiptGenerator');
    const path = require('path');
    const fs = require('fs');

    let receiptData = null;

    try {
      // Generate unique receipt number
      const receiptNumber = await Receipt.generateReceiptNumber();

      // Calculate billing info
      const billing = {
        totalAmount: enrollment.payment.totalAmount,
        paidBefore: enrollment.payment.paidAmount - parseFloat(amount),
        paidNow: parseFloat(amount),
        remainingBalance: enrollment.payment.remainingAmount
      };

      // Prepare receipt data (include S.P. info when paid in Syrian Pounds)
      const paymentData = {
        amount: parseFloat(amount),
        method: paymentMethod || 'cash',
        date: new Date(),
        notes: notes || ''
      };
      if (paymentCurrency === 'sp' && amountInSP != null) {
        paymentData.paymentCurrency = 'sp';
        paymentData.amountInSP = parseFloat(amountInSP);
      }

      const pdfReceiptData = {
        receiptNumber,
        student: {
          name: enrollment.student.name,
          email: enrollment.student.email
        },
        course: {
          title: enrollment.course.title
        },
        payment: paymentData,
        billing,
        enrollmentNotes: enrollment.notes || '',
        issuedBy: {
          name: req.user.name
        }
      };

      // Generate PDF
      const fileName = `${receiptNumber}.pdf`;
      const uploadsDir = path.join(__dirname, '../../uploads/receipts');

      // Ensure uploads directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const pdfPath = path.join(uploadsDir, fileName);
      await generateReceipt(pdfReceiptData, pdfPath);

      // Save receipt to database
      const receiptPaymentData = {
        amount: parseFloat(amount),
        method: paymentMethod || 'cash',
        date: new Date(),
        notes: notes || ''
      };
      if (paymentCurrency === 'sp' && amountInSP != null) {
        receiptPaymentData.paymentCurrency = 'sp';
        receiptPaymentData.paidInSP = parseFloat(amountInSP);
      }

      const receipt = await Receipt.create({
        receiptNumber,
        enrollment: enrollment._id,
        student: enrollment.student._id,
        course: enrollment.course._id,
        payment: receiptPaymentData,
        billing,
        pdfPath: `uploads/receipts/${fileName}`,
        issuedBy: req.user.id
      });

      receiptData = {
        receiptId: receipt._id,
        receiptNumber: receipt.receiptNumber,
        downloadUrl: `/api/reception/receipts/${receipt._id}/download`
      };

    } catch (receiptError) {
      console.error('Error generating receipt (payment still recorded):', receiptError);
      // Continue - payment is recorded even if receipt generation fails
    }

    const populatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate('student', 'name email')
      .populate('course', 'title price');

    // Send notification to student about successful payment
    try {
      const formattedAmount = `${parseFloat(amount).toLocaleString()} S.P.`;
      const notificationBody = `Your payment of ${formattedAmount} for ${enrollment.course.title} has been recorded`;
      
      await sendNotificationToUser(
        enrollment.student._id,
        'Payment Received',
        notificationBody,
        {
          type: 'payment_success',
          enrollmentId: enrollment._id.toString(),
          courseId: enrollment.course._id.toString(),
          amount: parseFloat(amount),
          paymentType: 'course',
          screen: 'payments'
        }
      );
      
      logger.info(`Payment notification sent to student ${enrollment.student._id}`, {
        enrollmentId: enrollment._id,
        amount: parseFloat(amount)
      });
    } catch (notificationError) {
      // Log but don't fail the request
      logger.error(`Failed to send payment notification: ${notificationError.message}`, {
        enrollmentId: enrollment._id,
        error: notificationError
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment recorded successfully',
      data: populatedEnrollment,
      receipt: receiptData
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording payment',
    });
  }
};

/**
 * @desc    Get available courses for enrollment
 * @route   GET /api/reception/enrollments/available-courses
 * @access  Private/Reception
 */
const getAvailableCourses = async (req, res) => {
  try {
    const filter = req.query.all === 'true' ? {} : { status: 'published' };

    if (req.query.type) {
      // Explicit type filter — ?type=bundle for bundle enrollment modal
      filter.type = req.query.type;
    } else if (req.query.includeBundles !== 'true') {
      // Regular enrollment form: exclude bundles (they have price=0 and must be enrolled via the bundle flow)
      // Pass ?includeBundles=true to show all courses including bundles (used for course filter dropdowns)
      filter.type = { $ne: 'bundle' };
    }

    let query = Course.find(filter)
      .select('title description price category level instructor status type bundlePrice bundleCourses')
      .populate('instructor', 'name');

    // Populate sub-courses when fetching bundles
    if (req.query.type === 'bundle') {
      query = query.populate({
        path: 'bundleCourses',
        select: 'title price level status duration totalHours'
      });
    }

    const courses = await query.sort({ title: 1 });

    res.status(200).json({
      success: true,
      data: courses
    });
  } catch (error) {
    console.error('Error fetching available courses:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available courses',
    });
  }
};

/**
 * @desc    Get available groups for a course
 * @route   GET /api/reception/enrollments/available-groups/:courseId
 * @access  Private/Reception
 */
const getAvailableGroups = async (req, res) => {
  try {
    const { courseId } = req.params;

    const groups = await Group.find({
      courseId,
      status: 'active'
    })
      .populate('trainerId', 'name')
      .select('name trainerId maxStudents students schedule startDate endDate')
      .sort({ name: 1 });

    // Add availability info
    const groupsWithAvailability = groups.map(group => ({
      ...group.toObject(),
      availableSeats: group.maxStudents - group.students.length,
      isFull: group.students.length >= group.maxStudents
    }));

    res.status(200).json({
      success: true,
      data: groupsWithAvailability
    });
  } catch (error) {
    console.error('Error fetching available groups:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available groups',
    });
  }
};

/**
 * @desc    Get students for dropdown (not enrolled in specific course)
 * @route   GET /api/reception/enrollments/available-students
 * @access  Private/Reception
 */
const getAvailableStudents = async (req, res) => {
  try {
    const { courseId, search } = req.query;

    const baseQuery = { role: 'student' };
    if (search) {
      const re = new RegExp(search, 'i');
      baseQuery.$or = [{ name: re }, { email: re }];
    }

    let students;

    if (courseId) {
      // Get students not enrolled in this course
      const enrolledStudents = await Enrollment.find({
        course: courseId,
        status: { $in: ['active', 'completed'] }
      }).distinct('student');

      students = await User.find({ ...baseQuery, _id: { $nin: enrolledStudents } })
        .select('name email')
        .sort({ name: 1 })
        .limit(50);
    } else {
      students = await User.find(baseQuery)
        .select('name email')
        .sort({ name: 1 })
        .limit(50);
    }

    res.status(200).json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error('Error fetching available students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available students',
    });
  }
};

/**
 * @desc    Update enrollment status
 * @route   PUT /api/reception/enrollments/:id/status
 * @access  Private/Reception
 */
const updateEnrollmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    // Validate required fields
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    // Validate that reason is provided when changing to inactive
    if (status === 'inactive' && !reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required when marking enrollment as inactive'
      });
    }

    // Find enrollment
    const enrollment = await Enrollment.findById(id)
      .populate('student', 'name email')
      .populate('course', 'title');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Update status
    enrollment.status = status;

    // Add to status history
    enrollment.statusHistory.push({
      status,
      reason: reason || `Changed to ${status}`,
      changedAt: new Date()
    });

    await enrollment.save();

    // Cascade status change to bundle sub-course enrollments so the student's
    // access to each sub-course group mirrors the bundle-level status.
    const subEnrollments = await Enrollment.find({ bundleEnrollmentId: enrollment._id });
    if (subEnrollments.length > 0) {
      await Enrollment.updateMany(
        { bundleEnrollmentId: enrollment._id },
        {
          $set: { status },
          $push: {
            statusHistory: {
              status,
              reason: reason || `Bundle enrollment set to ${status}`,
              changedAt: new Date()
            }
          }
        }
      );
    }

    // Send notification to student when enrollment is marked inactive
    if (status === 'inactive') {
      try {
        const studentId = enrollment.student._id || enrollment.student;
        const courseTitle = enrollment.course?.title || 'your course';
        await createAndEmitNotification(
          studentId,
          'enrollment',
          'Account Deactivated',
          `Your enrollment in ${courseTitle} has been deactivated. Reason: ${reason}`,
          {
            enrollmentId: enrollment._id.toString(),
            courseTitle,
            reason,
            status: 'inactive'
          },
          {
            actionUrl: '/student',
            actionLabel: 'View Dashboard'
          }
        );
      } catch (notifError) {
        logger.error(`Failed to send deactivation notification: ${notifError.message}`, {
          enrollmentId: id
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Enrollment status updated successfully',
      data: enrollment
    });
  } catch (error) {
    console.error('Error updating enrollment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update enrollment status',
    });
  }
};

/**
 * @desc    Delete enrollment
 * @route   DELETE /api/reception/enrollments/:id
 * @access  Private/Reception
 */
const deleteEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const fs = require('fs');
    const path = require('path');
    const Receipt = require('../models/Receipt');
    const Payment = require('../models/Payment');

    const enrollment = await Enrollment.findById(id);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // 1. Delete all receipts and their PDF files
    const receipts = await Receipt.find({ enrollment: id });
    for (const receipt of receipts) {
      // Delete PDF file if exists
      if (receipt.pdfPath) {
        const pdfFullPath = path.join(__dirname, '../../', receipt.pdfPath);
        if (fs.existsSync(pdfFullPath)) {
          fs.unlinkSync(pdfFullPath);
        }
      }
    }
    // Delete receipt records from database
    await Receipt.deleteMany({ enrollment: id });

    // 2. Delete all payments associated with this enrollment
    await Payment.deleteMany({ enrollment: id });

    // 3. Remove student from group if assigned
    const groups = await Group.find({
      courseId: enrollment.course,
      students: enrollment.student
    });

    for (const group of groups) {
      group.students = group.students.filter(
        studentId => studentId.toString() !== enrollment.student.toString()
      );
      await group.save();
    }

    // 3b. If this is a bundle enrollment, cascade-delete all sub-course enrollments.
    //     Without this, the student stays in sub-course groups and their orphaned
    //     sub-enrollments block any future re-enrollment into the same bundle.
    const subEnrollments = await Enrollment.find({ bundleEnrollmentId: id });
    if (subEnrollments.length > 0) {
      for (const subEnr of subEnrollments) {
        // Remove student from this sub-course's group
        const subGroups = await Group.find({
          courseId: subEnr.course,
          students: subEnr.student
        });
        for (const g of subGroups) {
          g.students = g.students.filter(
            sid => sid.toString() !== subEnr.student.toString()
          );
          await g.save();
        }

        // Delete receipts + payments for this sub-enrollment
        const subReceipts = await Receipt.find({ enrollment: subEnr._id });
        for (const r of subReceipts) {
          if (r.pdfPath) {
            const pdfFullPath = path.join(__dirname, '../../', r.pdfPath);
            if (fs.existsSync(pdfFullPath)) fs.unlinkSync(pdfFullPath);
          }
        }
        await Receipt.deleteMany({ enrollment: subEnr._id });
        await Payment.deleteMany({ enrollment: subEnr._id });
      }

      // Delete all sub-course enrollment records
      await Enrollment.deleteMany({ bundleEnrollmentId: id });
    }

    // 4. Delete the enrollment itself
    await enrollment.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Enrollment and all related data deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting enrollment:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting enrollment',
    });
  }
};

/**
 * @desc    Check if student is already enrolled in course/group
 * @route   GET /api/reception/enrollments/check
 * @access  Private/Reception
 */
const checkEnrollment = async (req, res) => {
  try {
    const { studentId, courseId, groupId } = req.query;

    if (!studentId || !courseId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and Course ID are required'
      });
    }

    // Check enrollment in course
    const courseEnrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
      status: { $in: ['active', 'completed'] }
    }).populate('course', 'title').populate('student', 'name email');

    // Check if student is in group (if groupId provided)
    let groupEnrollment = null;
    if (groupId) {
      const Group = require('../models/Group');
      const group = await Group.findById(groupId);
      if (group && group.students.includes(studentId)) {
        groupEnrollment = {
          groupId: group._id,
          groupName: group.name || 'Unnamed Group'
        };
      }
    }

    res.status(200).json({
      success: true,
      data: {
        isEnrolledInCourse: !!courseEnrollment,
        isEnrolledInGroup: !!groupEnrollment,
        courseEnrollment: courseEnrollment ? {
          _id: courseEnrollment._id,
          status: courseEnrollment.status,
          course: courseEnrollment.course,
          student: courseEnrollment.student
        } : null,
        groupEnrollment: groupEnrollment
      }
    });
  } catch (error) {
    console.error('Error checking enrollment:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking enrollment',
    });
  }
};

/**
 * @desc    Record a transportation payment for an enrollment
 * @route   POST /api/reception/enrollments/:id/transportation-payment
 * @access  Private/Reception
 */
const recordTransportationPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, notes } = req.body;

    // parseFloat accepts "12abc" as 12 and " " as NaN; validate the parsed
    // number rather than the raw input.
    const paymentAmount = parseFloat(amount);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid payment amount is required'
      });
    }

    // Same lost-update race as recordPayment, but this handler also reallocates
    // the installment array, which no single atomic operator can express. So it
    // uses compare-and-swap instead: read the current balance, compute the new
    // state, then write only if the balance is still what we read. If another
    // payment landed in between, the filter matches nothing and we retry from
    // fresh state rather than overwriting it.
    const MAX_ATTEMPTS = 3;
    let enrollment = null;
    let conflict = false;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const current = await Enrollment.findById(id);

      if (!current) {
        return res.status(404).json({
          success: false,
          message: 'Enrollment not found'
        });
      }

      if (!current.transportation || !current.transportation.enabled) {
        return res.status(400).json({
          success: false,
          message: 'Transportation is not enabled for this enrollment'
        });
      }

      const observedPaid = current.transportation.paidAmount;
      const newPaidAmount = observedPaid + paymentAmount;

      if (newPaidAmount > current.transportation.totalAmount) {
        return res.status(400).json({
          success: false,
          message: `Payment amount exceeds remaining balance. Remaining: ${current.transportation.remainingAmount.toLocaleString()} S.P.`
        });
      }

      // Allocate the payment across pending installments, oldest first.
      const installments = current.transportation.installments.map((i) =>
        (typeof i.toObject === 'function' ? i.toObject() : { ...i })
      );
      let remainingToAllocate = paymentAmount;
      const extraInstallments = [];

      for (const installment of installments) {
        if (installment.status === 'pending' && remainingToAllocate > 0) {
          if (remainingToAllocate >= installment.amount) {
            installment.status = 'paid';
            installment.paidDate = new Date();
            remainingToAllocate -= installment.amount;
          } else {
            // Partial payment — the unpaid remainder becomes its own installment
            const remainder = installment.amount - remainingToAllocate;
            installment.amount = remainingToAllocate;
            installment.status = 'paid';
            installment.paidDate = new Date();

            extraInstallments.push({
              amount: remainder,
              dueDate: installment.dueDate,
              status: 'pending'
            });
            remainingToAllocate = 0;
          }
        }
      }

      const result = await Enrollment.updateOne(
        { _id: id, 'transportation.paidAmount': observedPaid },
        {
          $set: {
            'transportation.paidAmount': newPaidAmount,
            'transportation.remainingAmount': current.transportation.totalAmount - newPaidAmount,
            'transportation.installments': [...installments, ...extraInstallments]
          }
        }
      );

      if (result.matchedCount === 1) {
        conflict = false;
        break;
      }

      conflict = true;
    }

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: 'Another payment was recorded at the same time. Please review the balance and try again.'
      });
    }

    enrollment = await Enrollment.findById(id)
      .populate('student', 'name email')
      .populate('course', 'title price');

    // ========== AUTO-GENERATE TRANSPORTATION RECEIPT ==========
    const Receipt = require('../models/Receipt');
    const { generateReceipt } = require('../utils/receiptGenerator');
    const path = require('path');
    const fs = require('fs');

    let receiptData = null;

    try {
      // Generate unique receipt number
      const receiptNumber = await Receipt.generateReceiptNumber();

      // Calculate billing info for transportation
      const billing = {
        totalAmount: enrollment.transportation.totalAmount,
        paidBefore: enrollment.transportation.paidAmount - paymentAmount,
        paidNow: paymentAmount,
        remainingBalance: enrollment.transportation.remainingAmount
      };

      // Prepare receipt data
      const pdfReceiptData = {
        receiptNumber,
        student: {
          name: enrollment.student.name,
          email: enrollment.student.email
        },
        course: {
          title: enrollment.course.title
        },
        payment: {
          amount: paymentAmount,
          method: paymentMethod || 'cash',
          date: new Date(),
          notes: notes || ''
        },
        billing,
        enrollmentNotes: enrollment.notes || '',
        issuedBy: {
          name: req.user.name
        },
        type: 'transportation'
      };

      // Generate PDF
      const fileName = `TRANS-${receiptNumber}.pdf`;
      const uploadsDir = path.join(__dirname, '../../uploads/receipts');

      // Ensure uploads directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const pdfPath = path.join(uploadsDir, fileName);
      await generateReceipt(pdfReceiptData, pdfPath);

      // Save receipt to database
      const receipt = await Receipt.create({
        receiptNumber,
        enrollment: enrollment._id,
        student: enrollment.student._id,
        course: enrollment.course._id,
        payment: {
          amount: paymentAmount,
          method: paymentMethod || 'cash',
          date: new Date(),
          notes: notes || ''
        },
        billing,
        pdfPath: `uploads/receipts/${fileName}`,
        issuedBy: req.user.id,
        type: 'transportation'
      });

      receiptData = {
        receiptId: receipt._id,
        receiptNumber: receipt.receiptNumber,
        downloadUrl: `/api/reception/receipts/${receipt._id}/download`
      };
    } catch (receiptError) {
      console.error('Error generating transportation receipt:', receiptError);
      // Don't fail the payment if receipt generation fails
    }

    // Send notification to student about successful transportation payment
    try {
      const formattedAmount = `${paymentAmount.toLocaleString()} S.P.`;
      const notificationBody = `Your transportation payment of ${formattedAmount} has been recorded`;
      
      await sendNotificationToUser(
        enrollment.student._id,
        'Transportation Payment Received',
        notificationBody,
        {
          type: 'payment_success',
          enrollmentId: enrollment._id.toString(),
          courseId: enrollment.course._id.toString(),
          amount: paymentAmount,
          paymentType: 'transportation',
          screen: 'payments'
        }
      );
      
      logger.info(`Transportation payment notification sent to student ${enrollment.student._id}`, {
        enrollmentId: enrollment._id,
        amount: paymentAmount
      });
    } catch (notificationError) {
      // Log but don't fail the request
      logger.error(`Failed to send transportation payment notification: ${notificationError.message}`, {
        enrollmentId: enrollment._id,
        error: notificationError
      });
    }

    res.status(200).json({
      success: true,
      message: 'Transportation payment recorded successfully',
      data: {
        enrollment: enrollment,
        receipt: receiptData
      }
    });
  } catch (error) {
    console.error('Error recording transportation payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording transportation payment',
    });
  }
};

/**
 * @desc    Get transportation payment history for an enrollment
 * @route   GET /api/reception/enrollments/:id/transportation-receipts
 * @access  Private/Reception
 */
const getTransportationReceipts = async (req, res) => {
  try {
    const { id } = req.params;
    const Receipt = require('../models/Receipt');

    const enrollment = await Enrollment.findById(id);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Get all transportation receipts for this enrollment
    const receipts = await Receipt.find({
      enrollment: id,
      type: 'transportation'
    })
      .populate('issuedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: receipts
    });
  } catch (error) {
    console.error('Error fetching transportation receipts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transportation receipts',
    });
  }
};

/**
 * @desc    Mark overdue transportation installments for all enrollments
 * @route   POST /api/reception/enrollments/mark-overdue-transportation
 * @access  Private/Reception
 */
const markOverdueTransportationInstallments = async (req, res) => {
  try {
    const now = new Date();
    let totalUpdated = 0;
    let enrollmentsUpdated = 0;

    // Find all enrollments with enabled transportation
    const enrollments = await Enrollment.find({
      'transportation.enabled': true,
      'transportation.installments': { $exists: true, $ne: [] }
    });

    // Process each enrollment
    for (const enrollment of enrollments) {
      if (!enrollment.transportation || !enrollment.transportation.installments) {
        continue;
      }

      let enrollmentUpdated = false;

      // Check each installment
      for (const installment of enrollment.transportation.installments) {
        // Mark as overdue if pending and due date has passed
        if (installment.status === 'pending' && new Date(installment.dueDate) < now) {
          installment.status = 'overdue';
          totalUpdated++;
          enrollmentUpdated = true;
        }
      }

      // Save enrollment if any installments were updated
      if (enrollmentUpdated) {
        await enrollment.save();
        enrollmentsUpdated++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Successfully marked ${totalUpdated} transportation installment(s) as overdue across ${enrollmentsUpdated} enrollment(s)`,
      data: {
        installmentsMarked: totalUpdated,
        enrollmentsUpdated: enrollmentsUpdated,
        totalEnrollmentsChecked: enrollments.length
      }
    });
  } catch (error) {
    console.error('Error marking overdue transportation installments:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking overdue transportation installments',
    });
  }
};

/**
 * @desc    Delete transportation from an enrollment
 * @route   DELETE /api/reception/enrollments/:id/transportation
 * @access  Private/Reception
 */
const deleteTransportation = async (req, res) => {
  try {
    const { id } = req.params;
    const fs = require('fs');
    const path = require('path');
    const Receipt = require('../models/Receipt');

    const enrollment = await Enrollment.findById(id);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check if transportation exists and is enabled
    if (!enrollment.transportation || !enrollment.transportation.enabled) {
      return res.status(400).json({
        success: false,
        message: 'Transportation is not enabled for this enrollment'
      });
    }

    // Find all transportation receipts for this enrollment
    const transportationReceipts = await Receipt.find({
      enrollment: id,
      type: 'transportation'
    });

    // Delete PDF files from filesystem
    for (const receipt of transportationReceipts) {
      if (receipt.pdfPath) {
        const pdfFullPath = path.join(__dirname, '../../', receipt.pdfPath);
        if (fs.existsSync(pdfFullPath)) {
          try {
            fs.unlinkSync(pdfFullPath);
          } catch (fileError) {
            console.error(`Error deleting PDF file ${pdfFullPath}:`, fileError);
            // Continue even if file deletion fails
          }
        }
      }
    }

    // Delete transportation receipt records from database
    await Receipt.deleteMany({
      enrollment: id,
      type: 'transportation'
    });

    // Reset transportation object to default values
    enrollment.transportation = {
      enabled: false,
      totalAmount: 0,
      paidAmount: 0,
      remainingAmount: 0,
      installments: []
    };

    await enrollment.save();

    const populatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate('student', 'name email')
      .populate('course', 'title price');

    res.status(200).json({
      success: true,
      message: 'Transportation deleted successfully. All transportation data, receipts, and payments have been removed.',
      data: populatedEnrollment
    });
  } catch (error) {
    console.error('Error deleting transportation:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting transportation',
    });
  }
};

/**
 * @desc    Enroll a waiting lead into a group (required) — applies their deposit as initial payment
 * @route   POST /api/reception/enrollments/from-waiting
 * @access  Private/Reception
 */
const enrollFromWaiting = async (req, res) => {
  try {
    const {
      leadId,
      groupId,
      notes,
      discount = 0,
      installments: customInstallments,
      transportation
    } = req.body;

    if (!leadId) {
      return res.status(400).json({ success: false, message: 'leadId is required' });
    }
    if (!groupId) {
      return res.status(400).json({ success: false, message: 'groupId is required — student must be assigned to a group' });
    }

    // Load the lead
    const Lead = require('../models/Lead');
    const lead = await Lead.findById(leadId).populate('waitingInfo.courseId', 'title price');
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    if (lead.status !== 'waiting') {
      return res.status(400).json({ success: false, message: 'Lead is not in waiting status' });
    }
    if (!lead.convertedToStudent) {
      return res.status(400).json({ success: false, message: 'Lead has no associated user account' });
    }
    if (!lead.waitingInfo?.courseId) {
      return res.status(400).json({ success: false, message: 'Lead has no course interest recorded' });
    }

    const studentId = lead.convertedToStudent.toString();
    const courseId = lead.waitingInfo.courseId._id
      ? lead.waitingInfo.courseId._id.toString()
      : lead.waitingInfo.courseId.toString();

    // Validate student
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student account not found' });
    }

    // Validate group exists and belongs to the right course
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    if (group.courseId.toString() !== courseId) {
      return res.status(400).json({ success: false, message: 'Group does not belong to the lead\'s course interest' });
    }

    // Validate course
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    // Check not already enrolled
    const existingEnrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
      status: { $in: ['active', 'completed'] }
    });
    if (existingEnrollment) {
      return res.status(400).json({ success: false, message: 'Student is already enrolled in this course' });
    }

    // Calculate total with discount
    const discountPercent = Math.min(Math.max(parseFloat(discount) || 0, 0), 100);
    let totalAmount = course.price;
    if (discountPercent > 0) {
      totalAmount = totalAmount - (totalAmount * (discountPercent / 100));
    }
    totalAmount = Math.round(totalAmount * 100) / 100;

    // Deposit already paid
    const depositAmount = parseFloat(lead.waitingInfo.depositAmount) || 0;
    const remainingAfterDeposit = Math.max(0, totalAmount - depositAmount);

    // Build installments
    let installments = [];
    if (customInstallments && Array.isArray(customInstallments) && customInstallments.length > 0) {
      installments = customInstallments.map(inst => ({
        amount: parseFloat(inst.amount),
        dueDate: new Date(inst.dueDate),
        status: 'pending'
      }));
    } else {
      installments.push({
        amount: remainingAfterDeposit,
        dueDate: new Date(),
        status: remainingAfterDeposit === 0 ? 'paid' : 'pending'
      });
    }

    // Transportation
    let transportationData = { enabled: false, totalAmount: 0, paidAmount: 0, remainingAmount: 0, installments: [] };
    if (transportation && transportation.enabled) {
      const tTotal = parseFloat(transportation.totalAmount) || 0;
      const tPaid = parseFloat(transportation.paidNow) || 0;
      const tRemaining = Math.max(0, tTotal - tPaid);
      let tInstallments = [];
      if (transportation.installments?.length > 0) {
        tInstallments = transportation.installments.map(inst => ({
          amount: parseFloat(inst.amount),
          dueDate: new Date(inst.dueDate),
          status: 'pending'
        }));
      } else if (tRemaining > 0) {
        tInstallments.push({ amount: tRemaining, dueDate: new Date(), status: 'pending' });
      }
      transportationData = { enabled: true, totalAmount: tTotal, paidAmount: tPaid, remainingAmount: tRemaining, installments: tInstallments };
    }

    // Create enrollment with deposit pre-applied
    const enrollment = await Enrollment.create({
      student: studentId,
      course: courseId,
      payment: {
        totalAmount,
        paidAmount: depositAmount,
        remainingAmount: remainingAfterDeposit,
        discount: discountPercent,
        installments
      },
      transportation: transportationData,
      notes: notes || `Enrolled from waiting list. Deposit of $${depositAmount} applied.`
    });

    // Add student to group
    if (!group.students.map(s => s.toString()).includes(studentId)) {
      group.students.push(studentId);
      await group.save();
    }

    // Create Payment record for the deposit so it is auditable
    if (depositAmount > 0) {
      const Payment = require('../models/Payment');
      const payment = new Payment({
        student: studentId,
        enrollment: enrollment._id,
        course: courseId,
        amount: depositAmount,
        paymentMethod: lead.waitingInfo.depositMethod || 'cash',
        status: 'completed',
        paidAt: lead.waitingInfo.depositPaidAt || new Date(),
        notes: `Pre-enrollment deposit recorded. ${lead.waitingInfo.depositNotes || ''}`.trim(),
        processedBy: req.user.id
      });
      await payment.save();
    }

    // Mark lead as student
    lead.status = 'student';
    lead.convertedAt = new Date();
    lead.statusHistory.push({
      fromStatus: 'waiting',
      toStatus: 'student',
      reason: `Enrolled in group "${group.name}" for course "${course.title}"`,
      changedBy: req.user.id,
      changedAt: new Date()
    });
    await lead.save();

    // Web notification
    try {
      await createAndEmitNotification(
        studentId,
        'enrollment',
        'Enrolled in Course',
        `You have been enrolled in ${course.title} — Group: ${group.name}. Total: $${totalAmount}${depositAmount > 0 ? ` (deposit $${depositAmount} applied)` : ''}.`,
        { enrollmentId: enrollment._id.toString(), courseId, courseTitle: course.title },
        { actionUrl: '/student/courses', actionLabel: 'View Course' }
      );
    } catch (_) {}

    const populated = await Enrollment.findById(enrollment._id)
      .populate('student', 'name email')
      .populate('course', 'title price');

    res.status(201).json({
      success: true,
      message: `Student enrolled successfully${depositAmount > 0 ? ` with $${depositAmount} deposit applied` : ''}`,
      data: populated
    });
  } catch (error) {
    console.error('Error enrolling from waiting:', error);
    res.status(500).json({ success: false, message: 'Error enrolling from waiting list' });
  }
};

/**
 * @desc    Enroll a student in a bundle (all sub-courses or selected ones)
 * @route   POST /api/reception/enrollments/bundle
 * @access  Private/Reception
 *
 * Body:
 *  {
 *    studentId: string,
 *    bundleId:  string,
 *    enrollFull: boolean,           // true = all sub-courses at bundlePrice
 *    selectedCourseIds: string[],   // used when enrollFull=false (partial)
 *    groupSelections: [{ courseId, groupId }],  // one per sub-course being enrolled
 *    notes: string,
 *    discount: number,              // applied on top of bundlePrice (enrollFull) or per-course (partial)
 *    installments: [{ amount, dueDate }]  // custom plan; auto-split if omitted
 *  }
 */
const enrollInBundle = async (req, res) => {
  try {
    const {
      studentId,
      bundleId,
      enrollFull = true,
      selectedCourseIds = [],
      groupSelections = [],
      notes = '',
      discount = 0,
      installments: customInstallments
    } = req.body;

    if (!studentId || !bundleId) {
      return res.status(400).json({ success: false, message: 'studentId and bundleId are required' });
    }

    // Load student
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Load bundle with sub-courses
    const bundle = await Course.findById(bundleId).populate('bundleCourses', 'title price');
    if (!bundle) return res.status(404).json({ success: false, message: 'Bundle not found' });
    if (bundle.type !== 'bundle') return res.status(400).json({ success: false, message: 'Selected course is not a bundle' });
    if (!bundle.bundleCourses?.length) {
      return res.status(400).json({ success: false, message: 'Bundle has no sub-courses' });
    }

    // Determine which sub-courses to enroll in
    const coursesToEnroll = enrollFull
      ? bundle.bundleCourses
      : bundle.bundleCourses.filter(c => selectedCourseIds.includes(c._id.toString()));

    if (!coursesToEnroll.length) {
      return res.status(400).json({ success: false, message: 'No sub-courses selected for enrollment' });
    }

    // Conflict check: student already enrolled in any of the selected sub-courses
    const alreadyEnrolled = await Enrollment.find({
      student: studentId,
      course: { $in: coursesToEnroll.map(c => c._id) },
      status: { $in: ['active', 'completed'] }
    }).populate('course', 'title');

    if (alreadyEnrolled.length > 0) {
      // Separate orphaned sub-enrollments (parent bundle was deleted) from real conflicts.
      // Orphaned ones: enrollmentSource='bundle' AND bundleEnrollmentId points to a deleted enrollment.
      const orphaned = [];
      const realConflicts = [];

      for (const enr of alreadyEnrolled) {
        if (enr.enrollmentSource === 'bundle' && enr.bundleEnrollmentId) {
          const parentExists = await Enrollment.exists({ _id: enr.bundleEnrollmentId });
          if (!parentExists) {
            orphaned.push(enr);
          } else {
            realConflicts.push(enr);
          }
        } else {
          realConflicts.push(enr);
        }
      }

      // Auto-clean orphaned sub-enrollments so re-enrollment can proceed
      if (orphaned.length > 0) {
        const orphanedIds = orphaned.map(e => e._id);

        // Remove student from orphaned sub-course groups
        for (const enr of orphaned) {
          const subGroups = await Group.find({ courseId: enr.course, students: enr.student });
          for (const g of subGroups) {
            g.students = g.students.filter(sid => sid.toString() !== enr.student.toString());
            await g.save();
          }
        }

        await Enrollment.deleteMany({ _id: { $in: orphanedIds } });
      }

      // Only block if there are real (non-orphaned) conflicts
      if (realConflicts.length > 0) {
        const titles = realConflicts.map(e => e.course?.title || e.course).join(', ');
        return res.status(400).json({
          success: false,
          message: `Student is already enrolled in: ${titles}. Remove those enrollments first or deselect those sub-courses.`,
          conflicts: realConflicts.map(e => ({ courseId: e.course?._id || e.course, title: e.course?.title }))
        });
      }
    }

    const discountPercent = Math.min(Math.max(parseFloat(discount) || 0, 0), 100);

    // ── Full bundle enrollment ──────────────────────────────────────────────
    if (enrollFull) {
      let totalAmount = bundle.bundlePrice;
      if (discountPercent > 0) {
        totalAmount = totalAmount - (totalAmount * (discountPercent / 100));
      }
      totalAmount = Math.round(totalAmount * 100) / 100;

      // Build installment schedule for the bundle payment
      let installments = [];
      if (customInstallments?.length) {
        installments = customInstallments.map(i => ({ amount: parseFloat(i.amount), dueDate: new Date(i.dueDate), status: 'pending' }));
      } else {
        installments = [{ amount: totalAmount, dueDate: new Date(), status: 'pending' }];
      }

      // Create the master bundle enrollment (carries all the payment)
      const bundleEnrollment = await Enrollment.create({
        student: studentId,
        course: bundleId,
        payment: { totalAmount, paidAmount: 0, remainingAmount: totalAmount, discount: discountPercent, installments },
        notes,
        enrollmentSource: 'direct'
      });

      // Create sub-course enrollments (zero-price; payment tracked on bundle enrollment)
      const subEnrollments = await Promise.all(
        coursesToEnroll.map(sc =>
          Enrollment.create({
            student: studentId,
            course: sc._id,
            payment: { totalAmount: 0, paidAmount: 0, remainingAmount: 0, discount: 0, installments: [] },
            notes: `Part of bundle: ${bundle.title}`,
            enrollmentSource: 'bundle',
            bundleEnrollmentId: bundleEnrollment._id
          })
        )
      );

      // Add student to selected group per sub-course
      const groupMap = Object.fromEntries(groupSelections.map(g => [g.courseId, g.groupId]));
      for (const sc of coursesToEnroll) {
        const gid = groupMap[sc._id.toString()];
        if (gid) {
          const group = await Group.findById(gid);
          if (group && !group.students.map(s => s.toString()).includes(studentId)) {
            group.students.push(studentId);
            await group.save();
          }
        }
      }

      // Notify student
      try {
        await createAndEmitNotification(
          studentId,
          'enrollment',
          'Bundle Enrollment',
          `You have been enrolled in the ${bundle.title} bundle (${coursesToEnroll.length} courses). Total: ${totalAmount.toLocaleString()} S.P.`,
          { enrollmentId: bundleEnrollment._id.toString(), courseId: bundleId, courseTitle: bundle.title, totalAmount },
          { actionUrl: '/student/courses', actionLabel: 'View Courses' }
        );
      } catch (_) {}

      return res.status(201).json({
        success: true,
        message: `Student enrolled in full bundle (${coursesToEnroll.length} courses)`,
        data: {
          bundleEnrollment,
          subEnrollments,
          pricing: { bundlePrice: bundle.bundlePrice, discount: discountPercent, totalCharged: totalAmount }
        }
      });
    }

    // ── Partial enrollment (selected sub-courses at individual prices) ──────
    const createdEnrollments = [];
    for (const sc of coursesToEnroll) {
      let totalAmount = sc.price || 0;
      if (discountPercent > 0) {
        totalAmount = totalAmount - (totalAmount * (discountPercent / 100));
      }
      totalAmount = Math.round(totalAmount * 100) / 100;

      const installments = customInstallments?.length
        ? customInstallments.map(i => ({ amount: parseFloat(i.amount), dueDate: new Date(i.dueDate), status: 'pending' }))
        : [{ amount: totalAmount, dueDate: new Date(), status: 'pending' }];

      const enrollment = await Enrollment.create({
        student: studentId,
        course: sc._id,
        payment: { totalAmount, paidAmount: 0, remainingAmount: totalAmount, discount: discountPercent, installments },
        notes,
        enrollmentSource: 'direct'
      });
      createdEnrollments.push(enrollment);

      // Group assignment
      const groupMap = Object.fromEntries(groupSelections.map(g => [g.courseId, g.groupId]));
      const gid = groupMap[sc._id.toString()];
      if (gid) {
        const group = await Group.findById(gid);
        if (group && !group.students.map(s => s.toString()).includes(studentId)) {
          group.students.push(studentId);
          await group.save();
        }
      }
    }

    const partialTotal = createdEnrollments.reduce((sum, e) => sum + e.payment.totalAmount, 0);

    try {
      await createAndEmitNotification(
        studentId,
        'enrollment',
        'Course Enrollment',
        `You have been enrolled in ${createdEnrollments.length} course(s) from the ${bundle.title} bundle.`,
        { courseTitle: bundle.title },
        { actionUrl: '/student/courses', actionLabel: 'View Courses' }
      );
    } catch (_) {}

    return res.status(201).json({
      success: true,
      message: `Student enrolled in ${createdEnrollments.length} course(s) from bundle`,
      data: {
        enrollments: createdEnrollments,
        pricing: { individualTotal: partialTotal, discount: discountPercent }
      }
    });

  } catch (error) {
    console.error('Error enrolling in bundle:', error);
    res.status(500).json({ success: false, message: 'Error processing bundle enrollment' });
  }
};

/**
 * @desc    Get sub-course enrollments for a bundle enrollment
 * @route   GET /api/reception/enrollments/:enrollmentId/sub-enrollments
 * @access  Private/Reception
 */
const getSubEnrollments = async (req, res) => {
  try {
    const { enrollmentId } = req.params;

    const subEnrollments = await Enrollment.find({
      bundleEnrollmentId: enrollmentId,
      enrollmentSource: 'bundle'
    })
      .populate('course', 'title category level price thumbnail')
      .populate('student', 'name email')
      .sort({ enrolledAt: 1 });

    // Get group assignment for each sub-enrollment
    const withGroups = await Promise.all(subEnrollments.map(async (se) => {
      const studentId = se.student?._id || se.student;
      const group = await Group.findOne({
        courseId: se.course._id,
        students: studentId
      }).select('name maxStudents students status');

      return {
        _id: se._id,
        course: se.course,
        status: se.status,
        enrolledAt: se.enrolledAt,
        group: group ? {
          _id: group._id,
          name: group.name,
          status: group.status,
          enrolledCount: group.students?.length || 0,
          maxStudents: group.maxStudents
        } : null
      };
    }));

    res.json({ success: true, data: withGroups });
  } catch (error) {
    console.error('Error fetching sub-enrollments:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sub-enrollments' });
  }
};

module.exports = {
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
};
