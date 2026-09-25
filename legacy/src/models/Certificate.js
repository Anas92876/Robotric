const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    certificateNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    issuedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    // Snapshot of data at time of issue (so cert stays valid even if records change)
    snapshot: {
      studentName:   { type: String, required: true },
      courseName:    { type: String, required: true },
      courseLevel:   { type: String, default: '' },
      trainingHours: { type: Number, default: 0 },
      gender:        { type: String, enum: ['male', 'female'], default: 'male' },
    },
  },
  { timestamps: true }
);

// Generate unique cert number: CERT-YYYY-XXXXXX
certificateSchema.statics.generateCertNumber = async function () {
  const year = new Date().getFullYear();
  const prefix = `CERT-${year}-`;
  // Find highest existing number for this year
  const last = await this.findOne(
    { certificateNumber: { $regex: `^${prefix}` } },
    { certificateNumber: 1 },
    { sort: { certificateNumber: -1 } }
  );
  let seq = 1;
  if (last) {
    const parts = last.certificateNumber.split('-');
    seq = (parseInt(parts[2], 10) || 0) + 1;
  }
  return `${prefix}${String(seq).padStart(6, '0')}`;
};

module.exports = mongoose.model('Certificate', certificateSchema);
