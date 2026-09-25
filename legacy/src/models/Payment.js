const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student is required']
  },
  enrollment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enrollment',
    required: [true, 'Enrollment is required']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'bank_transfer', 'online', 'sham_cash_app', 'check', 'other'],
    required: [true, 'Payment method is required']
  },
  transactionId: {
    type: String,
    trim: true,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  paidAt: {
    type: Date,
    default: null
  },
  receipt: {
    receiptNumber: {
      type: String,
      unique: true,
      sparse: true
    },
    receiptUrl: {
      type: String,
      default: null
    },
    generatedAt: {
      type: Date,
      default: null
    }
  },
  installmentNumber: {
    type: Number,
    default: null,
    min: [1, 'Installment number must be at least 1']
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  refund: {
    amount: {
      type: Number,
      default: null,
      min: [0, 'Refund amount cannot be negative']
    },
    reason: {
      type: String,
      maxlength: [500, 'Refund reason cannot exceed 500 characters']
    },
    refundedAt: {
      type: Date,
      default: null
    },
    refundedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  }
}, {
  timestamps: true
});

// Index for faster queries
PaymentSchema.index({ student: 1, course: 1 });
PaymentSchema.index({ enrollment: 1, status: 1 });
// receiptNumber already has unique: true, no need for additional index
PaymentSchema.index({ status: 1, paidAt: 1 });

// Generate receipt number before save
PaymentSchema.pre('save', async function(next) {
  if (!this.receipt.receiptNumber && this.status === 'completed') {
    // Generate receipt number: RCP-YYYYMMDD-XXXXX
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.constructor.countDocuments({
      'receipt.receiptNumber': new RegExp(`^RCP-${dateStr}`)
    });
    const sequence = String(count + 1).padStart(5, '0');
    this.receipt.receiptNumber = `RCP-${dateStr}-${sequence}`;
    this.receipt.generatedAt = new Date();
  }
  next();
});

// Method to mark as completed
PaymentSchema.methods.markAsCompleted = function(processedBy = null) {
  this.status = 'completed';
  this.paidAt = new Date();
  if (processedBy) {
    this.processedBy = processedBy;
  }
};

// Method to process refund
PaymentSchema.methods.processRefund = function(refundAmount, reason, refundedBy) {
  this.status = 'refunded';
  this.refund = {
    amount: refundAmount,
    reason: reason,
    refundedAt: new Date(),
    refundedBy: refundedBy
  };
};

// Static method to get student payment summary
PaymentSchema.statics.getStudentSummary = async function(studentId, courseId = null) {
  const query = { student: studentId };
  if (courseId) {
    query.course = courseId;
  }

  const payments = await this.find({ ...query, status: 'completed' });

  const summary = {
    totalPayments: payments.length,
    totalAmount: 0,
    byMethod: {},
    byCourse: {}
  };

  payments.forEach(payment => {
    summary.totalAmount += payment.amount;

    // Group by method
    if (!summary.byMethod[payment.paymentMethod]) {
      summary.byMethod[payment.paymentMethod] = 0;
    }
    summary.byMethod[payment.paymentMethod] += payment.amount;

    // Group by course
    const courseIdStr = payment.course.toString();
    if (!summary.byCourse[courseIdStr]) {
      summary.byCourse[courseIdStr] = 0;
    }
    summary.byCourse[courseIdStr] += payment.amount;
  });

  return summary;
};

// Static method to get course payment overview
PaymentSchema.statics.getCoursePaymentOverview = async function(courseId) {
  const result = await this.aggregate([
    { $match: { course: new mongoose.Types.ObjectId(courseId), status: 'completed' } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalPayments: { $sum: 1 },
        averagePayment: { $avg: '$amount' }
      }
    }
  ]);

  return result.length > 0 ? result[0] : {
    totalRevenue: 0,
    totalPayments: 0,
    averagePayment: 0
  };
};

module.exports = mongoose.model('Payment', PaymentSchema);
