/**
 * Receipt Controller
 *
 * Handles receipt generation, retrieval, and download
 */

const Receipt = require('../models/Receipt');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const Course = require('../models/Course');
const Lead = require('../models/Lead');
const { generateReceipt, regenerateReceiptFromDB } = require('../utils/receiptGenerator');
const path = require('path');
const fs = require('fs');

/**
 * @desc    Generate a payment receipt
 * @route   POST /api/reception/receipts/generate
 * @access  Private/Reception
 */
const createReceipt = async (req, res) => {
  try {
    const { enrollmentId, paymentAmount, paymentMethod, paymentNotes } = req.body;

    // Validate input
    if (!enrollmentId || !paymentAmount) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment ID and payment amount are required'
      });
    }

    // Get enrollment with populated data
    const enrollment = await Enrollment.findById(enrollmentId)
      .populate('student', 'name email')
      .populate('course', 'title');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Try to get English name from Lead database
    let studentName = enrollment.student.name;
    try {
      const lead = await Lead.findOne({
        $or: [
          { fullName: enrollment.student.name },
          { email: enrollment.student.email }
        ]
      }).select('englishName fullName');

      if (lead && lead.englishName && lead.englishName.trim()) {
        studentName = lead.englishName;
      }
    } catch (leadError) {
      console.log('Could not fetch lead data for English name:', leadError.message);
      // Continue with the original name
    }

    // Generate unique receipt number
    const receiptNumber = await Receipt.generateReceiptNumber();

    // Calculate billing info (payment should already be recorded in enrollment)
    const billing = {
      totalAmount: enrollment.payment.totalAmount,
      paidBefore: enrollment.payment.paidAmount - paymentAmount,
      paidNow: paymentAmount,
      remainingBalance: enrollment.payment.remainingAmount
    };

    // Prepare receipt data
    const receiptData = {
      receiptNumber,
      student: {
        name: studentName,
        email: enrollment.student.email
      },
      course: {
        title: enrollment.course.title
      },
      payment: {
        amount: paymentAmount,
        method: paymentMethod || 'cash',
        date: new Date(),
        notes: paymentNotes || ''
      },
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

    await generateReceipt(receiptData, pdfPath);

    // Save receipt to database
    const receipt = await Receipt.create({
      receiptNumber,
      enrollment: enrollmentId,
      student: enrollment.student._id,
      course: enrollment.course._id,
      payment: {
        amount: paymentAmount,
        method: paymentMethod || 'cash',
        date: new Date(),
        notes: paymentNotes || ''
      },
      billing,
      pdfPath: `uploads/receipts/${fileName}`,
      issuedBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Receipt generated successfully',
      data: {
        receiptId: receipt._id,
        receiptNumber: receipt.receiptNumber,
        downloadUrl: `/api/reception/receipts/${receipt._id}/download`
      }
    });

  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating receipt',
    });
  }
};

/**
 * @desc    Get receipt details
 * @route   GET /api/reception/receipts/:id
 * @access  Private/Reception
 */
const getReceipt = async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id)
      .populate('student', 'name email')
      .populate('course', 'title')
      .populate('enrollment')
      .populate('issuedBy', 'name');

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    res.status(200).json({
      success: true,
      data: receipt
    });

  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching receipt',
    });
  }
};

/**
 * @desc    Download receipt PDF (always regenerates to use latest template)
 * @route   GET /api/reception/receipts/:id/download
 * @access  Private/Reception
 */
const downloadReceipt = async (req, res) => {
  try {
    // Get receipt with populated data (needed for regeneration)
    const receipt = await Receipt.findById(req.params.id)
      .populate('student', 'name email')
      .populate('course', 'title')
      .populate('enrollment', 'notes')
      .populate('issuedBy', 'name');

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    // Get PDF file path (uses same filename to keep receipt number)
    const pdfPath = path.join(__dirname, '../..', receipt.pdfPath);

    // ALWAYS regenerate to ensure latest template is used
    console.log(`Regenerating PDF for receipt ${receipt.receiptNumber} with latest template...`);

    try {
      // Ensure uploads directory exists
      const uploadsDir = path.dirname(pdfPath);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Regenerate PDF from DB data with latest template
      // This keeps the same receipt number but uses the new template design
      await regenerateReceiptFromDB(receipt, pdfPath);
      console.log(`✓ PDF regenerated successfully for receipt ${receipt.receiptNumber}`);
    } catch (regenerateError) {
      console.error('Error regenerating receipt PDF:', regenerateError);
      return res.status(500).json({
        success: false,
        message: 'Error regenerating receipt PDF',
      });
    }

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${receipt.receiptNumber}.pdf"`);

    // Stream the PDF file
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error downloading receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading receipt',
    });
  }
};

/**
 * @desc    Get all receipts for an enrollment
 * @route   GET /api/reception/receipts/enrollment/:enrollmentId
 * @access  Private/Reception
 */
const getEnrollmentReceipts = async (req, res) => {
  try {
    const { enrollmentId } = req.params;

    const receipts = await Receipt.find({ enrollment: enrollmentId })
      .populate('issuedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: receipts
    });

  } catch (error) {
    console.error('Error fetching enrollment receipts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching receipts',
    });
  }
};

/**
 * @desc    Regenerate all receipts with new template
 * @route   POST /api/reception/receipts/regenerate-all
 * @access  Private/Reception
 */
const regenerateAllReceipts = async (req, res) => {
  try {
    console.log('Starting bulk receipt regeneration...');

    // Get all receipts
    const receipts = await Receipt.find()
      .populate('student', 'name email')
      .populate('course', 'title')
      .populate('enrollment', 'notes')
      .populate('issuedBy', 'name');

    console.log(`Found ${receipts.length} receipts to regenerate`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Regenerate each receipt
    for (const receipt of receipts) {
      try {
        const pdfPath = path.join(__dirname, '../..', receipt.pdfPath);

        // Ensure uploads directory exists
        const uploadsDir = path.dirname(pdfPath);
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Regenerate PDF from DB data
        await regenerateReceiptFromDB(receipt, pdfPath);
        successCount++;
        console.log(`✓ Regenerated: ${receipt.receiptNumber}`);
      } catch (error) {
        errorCount++;
        errors.push({
          receiptNumber: receipt.receiptNumber,
          error: error.message
        });
        console.error(`✗ Failed: ${receipt.receiptNumber} - ${error.message}`);
      }
    }

    console.log(`Regeneration complete: ${successCount} success, ${errorCount} errors`);

    res.status(200).json({
      success: true,
      message: 'Receipt regeneration completed',
      data: {
        total: receipts.length,
        successful: successCount,
        failed: errorCount,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('Error in bulk regeneration:', error);
    res.status(500).json({
      success: false,
      message: 'Error regenerating receipts',
    });
  }
};

module.exports = {
  createReceipt,
  getReceipt,
  downloadReceipt,
  getEnrollmentReceipts,
  regenerateAllReceipts
};
