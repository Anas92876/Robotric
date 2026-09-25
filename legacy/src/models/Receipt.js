/**
 * Receipt Model
 *
 * Stores payment receipt records with PDF generation
 */

const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  // Unique receipt number (e.g., REC-2025-0001)
  receiptNumber: {
    type: String,
    required: true,
    unique: true
  },

  // References
  enrollment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enrollment',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },

  // Payment details for this receipt
  payment: {
    amount: {
      type: Number,
      required: true
    },
    method: {
      type: String,
      enum: ['cash', 'card', 'bank_transfer', 'check', 'other'],
      default: 'cash'
    },
    date: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      default: ''
    },
    // When paid in Syrian Pounds: amount actually handed over
    paidInSP: {
      type: Number,
      default: null
    },
    paymentCurrency: {
      type: String,
      enum: ['usd', 'sp'],
      default: 'usd'
    }
  },

  // Billing summary at time of receipt
  billing: {
    totalAmount: {
      type: Number,
      required: true
    },
    paidBefore: {
      type: Number,
      required: true
    },
    paidNow: {
      type: Number,
      required: true
    },
    remainingBalance: {
      type: Number,
      required: true
    }
  },

  // PDF file path
  pdfPath: {
    type: String,
    required: true
  },

  // Issued by (reception staff)
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Receipt type: course payment or transportation payment
  type: {
    type: String,
    enum: ['course', 'transportation'],
    default: 'course'
  }
}, {
  timestamps: true
});

// Index for fast lookups
receiptSchema.index({ enrollment: 1, createdAt: -1 });
receiptSchema.index({ student: 1, createdAt: -1 });
receiptSchema.index({ receiptNumber: 1 });

/**
 * Generate next receipt number
 * Format: REC-YYYY-NNNN (e.g., REC-2025-0001)
 */
receiptSchema.statics.generateReceiptNumber = async function() {
  const year = new Date().getFullYear();
  const prefix = `REC-${year}-`;

  // Find the last receipt for this year
  const lastReceipt = await this.findOne({
    receiptNumber: new RegExp(`^${prefix}`)
  }).sort({ receiptNumber: -1 });

  let nextNumber = 1;
  if (lastReceipt) {
    // Extract number from last receipt (e.g., REC-2025-0042 -> 42)
    const lastNumber = parseInt(lastReceipt.receiptNumber.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  // Pad with zeros (e.g., 1 -> 0001)
  const paddedNumber = String(nextNumber).padStart(4, '0');
  return `${prefix}${paddedNumber}`;
};

module.exports = mongoose.model('Receipt', receiptSchema);
