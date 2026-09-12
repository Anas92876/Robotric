const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const StudentDocument = require('../models/StudentDocument');
const Group = require('../models/Group');
const supabase = require('../config/supabase');

const DOCUMENTS_BUCKET = 'documents';

// @desc    List all student documents (paginated, filterable)
// @route   GET /api/clo/documents
// @access  Private (CLO)
exports.getAllDocuments = asyncHandler(async (req, res) => {
  if (req.user.role !== 'clo') {
    throw new AppError('Access denied', 403);
  }

  const { status, documentType, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status && ['pending', 'verified', 'rejected'].includes(status)) {
    filter.verificationStatus = status;
  }
  if (documentType) {
    filter.documentType = documentType;
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [docs, total] = await Promise.all([
    StudentDocument.find(filter)
      .populate('studentId', 'name email')
      .populate('verifiedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    StudentDocument.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: docs,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
  });
});

// @desc    Get all documents for a specific student
// @route   GET /api/clo/documents/student/:studentId
// @access  Private (CLO)
exports.getStudentDocuments = asyncHandler(async (req, res) => {
  if (req.user.role !== 'clo') {
    throw new AppError('Access denied', 403);
  }

  const docs = await StudentDocument.find({ studentId: req.params.studentId })
    .populate('studentId', 'name email')
    .populate('verifiedBy', 'name')
    .sort({ documentType: 1 });

  res.json({ success: true, data: docs });
});

// @desc    Update verification status of a document
// @route   PATCH /api/clo/documents/:docId/status
// @access  Private (CLO)
exports.updateDocumentStatus = asyncHandler(async (req, res) => {
  if (req.user.role !== 'clo') {
    throw new AppError('Access denied', 403);
  }

  const { verificationStatus, verificationNote } = req.body;
  if (!['pending', 'verified', 'rejected'].includes(verificationStatus)) {
    throw new AppError('Invalid status. Use: pending, verified, or rejected', 400);
  }

  const doc = await StudentDocument.findById(req.params.docId);
  if (!doc) {
    throw new AppError('Document not found', 404);
  }

  doc.verificationStatus = verificationStatus;
  doc.verificationNote = verificationNote || null;
  if (verificationStatus === 'pending') {
    doc.verifiedBy = undefined;
    doc.verifiedAt = undefined;
  } else {
    doc.verifiedBy = req.user._id;
    doc.verifiedAt = new Date();
  }
  await doc.save();

  await doc.populate('studentId', 'name email');
  await doc.populate('verifiedBy', 'name');

  res.json({ success: true, data: doc });
});

// @desc    Get a signed download URL for a document
// @route   GET /api/clo/documents/:docId/download
// @access  Private (CLO)
exports.downloadDocument = asyncHandler(async (req, res) => {
  if (req.user.role !== 'clo') {
    throw new AppError('Access denied', 403);
  }

  if (!supabase) {
    throw new AppError('File storage is not configured', 503);
  }

  const doc = await StudentDocument.findById(req.params.docId);
  if (!doc) {
    throw new AppError('Document not found', 404);
  }

  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(doc.storagePath, 60);

  if (error || !data?.signedUrl) {
    throw new AppError('Failed to generate download link', 500);
  }

  res.json({ success: true, url: data.signedUrl });
});

// @desc    Get list of students with document summary (for CLO overview)
// @route   GET /api/clo/documents/students-summary
// @access  Private (CLO)
exports.getStudentsSummary = asyncHandler(async (req, res) => {
  if (req.user.role !== 'clo') {
    throw new AppError('Access denied', 403);
  }

  // Only include students enrolled in at least one WRO-required course
  const wroGroups = await Group.find()
    .populate({ path: 'courseId', select: 'wroDocumentsRequired', match: { wroDocumentsRequired: true } });

  const wroStudentIds = new Set();
  wroGroups.forEach((g) => {
    if (g.courseId) {
      (g.students || []).forEach((sid) => wroStudentIds.add(sid.toString()));
    }
  });

  if (wroStudentIds.size === 0) {
    return res.json({ success: true, data: [] });
  }

  const mongoose = require('mongoose');
  const wroStudentObjectIds = [...wroStudentIds].map((id) => new mongoose.Types.ObjectId(id));

  const summary = await StudentDocument.aggregate([
    { $match: { studentId: { $in: wroStudentObjectIds } } },
    {
      $group: {
        _id: '$studentId',
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$verificationStatus', 'pending'] }, 1, 0] } },
        verified: { $sum: { $cond: [{ $eq: ['$verificationStatus', 'verified'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$verificationStatus', 'rejected'] }, 1, 0] } },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'student',
      },
    },
    { $unwind: '$student' },
    {
      $project: {
        _id: 1,
        total: 1,
        pending: 1,
        verified: 1,
        rejected: 1,
        'student.name': 1,
        'student.email': 1,
      },
    },
    { $sort: { pending: -1, 'student.name': 1 } },
  ]);

  res.json({ success: true, data: summary });
});
