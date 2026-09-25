const mongoose = require('mongoose');

const DOCUMENT_TYPES = [
  'national_id',
  'official_photo',
  'civil_registry',
  'family_record',
  'travel_permission',
];

const studentDocumentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      enum: DOCUMENT_TYPES,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    storagePath: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    verificationNote: {
      type: String,
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

studentDocumentSchema.index({ studentId: 1, documentType: 1 });

module.exports = mongoose.model('StudentDocument', studentDocumentSchema);
module.exports.DOCUMENT_TYPES = DOCUMENT_TYPES;
