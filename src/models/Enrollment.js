const mongoose = require('mongoose');

const EnrollmentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student is required']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course is required']
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  progress: {
    completedModules: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module'
    }],
    currentModule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      default: null
    },
    percentageComplete: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lastAccessedAt: {
      type: Date,
      default: null
    }
  },
  payment: {
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative']
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Paid amount cannot be negative']
    },
    remainingAmount: {
      type: Number,
      default: 0,
      min: [0, 'Remaining amount cannot be negative']
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%']
    },
    installments: [{
      amount: {
        type: Number,
        required: true,
        min: [0, 'Installment amount cannot be negative']
      },
      dueDate: {
        type: Date,
        required: true
      },
      paidDate: {
        type: Date,
        default: null
      },
      status: {
        type: String,
        enum: ['pending', 'paid', 'overdue'],
        default: 'pending'
      },
      paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
        default: null
      }
    }],
    // recordPayment has always written this, but it was never declared, so
    // Mongoose's strict mode discarded it on every save. Declared now so the
    // write actually lands. (The companion field it also wrote,
    // payment.paymentHistory, was removed instead of declared: Receipt already
    // records every payment and is indexed for exactly that query.)
    lastPaymentDate: {
      type: Date,
      default: null
    }
  },
  attendance: {
    totalSessions: {
      type: Number,
      default: 0,
      min: [0, 'Total sessions cannot be negative']
    },
    attendedSessions: {
      type: Number,
      default: 0,
      min: [0, 'Attended sessions cannot be negative']
    },
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  grade: {
    quizAverage: {
      type: Number,
      default: null,
      min: 0,
      max: 100
    },
    assignmentAverage: {
      type: Number,
      default: null,
      min: 0,
      max: 100
    },
    overallGrade: {
      type: Number,
      default: null,
      min: 0,
      max: 100
    }
  },
  completedAt: {
    type: Date,
    default: null
  },
  certificate: {
    issued: {
      type: Boolean,
      default: false
    },
    issuedAt: {
      type: Date,
      default: null
    },
    certificateUrl: {
      type: String,
      default: null
    },
    certificateNumber: {
      type: String,
      default: null
    }
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['active', 'inactive', 'completed', 'dropped', 'suspended'],
      required: true
    },
    reason: {
      type: String,
      maxlength: [500, 'Reason cannot exceed 500 characters']
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: String
    }
  }],
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },

  // Bundle enrollment tracking
  enrollmentSource: {
    type: String,
    enum: ['direct', 'bundle'],
    default: 'direct'
  },
  bundleEnrollmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enrollment',
    default: null
  },

  transportation: {
    enabled: {
      type: Boolean,
      default: false
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, 'Transportation amount cannot be negative']
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Paid amount cannot be negative']
    },
    remainingAmount: {
      type: Number,
      default: 0,
      min: [0, 'Remaining amount cannot be negative']
    },
    installments: [{
      amount: {
        type: Number,
        required: true,
        min: [0, 'Installment amount cannot be negative']
      },
      dueDate: {
        type: Date,
        required: true
      },
      paidDate: {
        type: Date,
        default: null
      },
      status: {
        type: String,
        enum: ['pending', 'paid', 'overdue'],
        default: 'pending'
      },
      paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
        default: null
      }
    }],
    // Transportation route assignment.
    //
    // ─────────────────────────────────────────────────────────────────────────
    //  CACHE ONLY — DriverStudent is the authoritative record for everything
    //  about a student's bus seat (driver, home location, distance, monthly fee,
    //  pickup order, sessions/month). The fields below mirror a subset of that
    //  state so the Enrollment list can render without joining through
    //  DriverStudent on every row.
    //
    //  Rules:
    //    - WRITES: only via services/transport.cache.js#syncEnrollmentTransportCache,
    //      invoked from the DriverStudent mutation paths (create/update/remove).
    //    - READS: display only. NEVER use these for routing decisions, fee
    //      recalculation, or assignment checks. Always read DriverStudent for that.
    //    - Cache may briefly lag (if a sync failed) — never treat as truth.
    // ─────────────────────────────────────────────────────────────────────────
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportRoute', default: null },
    homeLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    homeAddress: { type: String, default: null },
    rawDistanceKm: { type: Number, default: null },
    roadDistanceKm: { type: Number, default: null },
    monthlyFeeEstimate: { type: Number, default: null },
    locationUpdatedAt: { type: Date, default: null },
    locationUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  }
}, {
  timestamps: true
});

// Compound index to ensure one enrollment per student per course
EnrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
EnrollmentSchema.index({ student: 1, status: 1 });
EnrollmentSchema.index({ course: 1, status: 1 });

// Pre-save middleware to calculate remaining amount
EnrollmentSchema.pre('save', function(next) {
  if (this.payment.totalAmount !== undefined && this.payment.paidAmount !== undefined) {
    this.payment.remainingAmount = this.payment.totalAmount - this.payment.paidAmount;
  }
  // Calculate transportation remaining amount
  if (this.transportation && this.transportation.totalAmount !== undefined && this.transportation.paidAmount !== undefined) {
    this.transportation.remainingAmount = this.transportation.totalAmount - this.transportation.paidAmount;
  }
  
  // Update overdue status for transportation installments
  if (this.transportation && this.transportation.installments && this.transportation.installments.length > 0) {
    const now = new Date();
    this.transportation.installments.forEach(installment => {
      if (installment.status === 'pending' && new Date(installment.dueDate) < now) {
        installment.status = 'overdue';
      }
    });
  }
  
  next();
});

// Method to update progress percentage
EnrollmentSchema.methods.updateProgressPercentage = async function(totalModules) {
  if (totalModules > 0) {
    this.progress.percentageComplete = Math.round(
      (this.progress.completedModules.length / totalModules) * 100
    );
  } else {
    this.progress.percentageComplete = 0;
  }
  await this.save();
};

// Method to update attendance percentage
EnrollmentSchema.methods.updateAttendancePercentage = function() {
  if (this.attendance.totalSessions > 0) {
    this.attendance.percentage = Math.round(
      (this.attendance.attendedSessions / this.attendance.totalSessions) * 100
    );
  } else {
    this.attendance.percentage = 0;
  }
};

// Static method to check if student is enrolled
EnrollmentSchema.statics.isEnrolled = async function(studentId, courseId) {
  const enrollment = await this.findOne({
    student: studentId,
    course: courseId,
    status: 'active'
  });
  return !!enrollment;
};

module.exports = mongoose.model('Enrollment', EnrollmentSchema);
