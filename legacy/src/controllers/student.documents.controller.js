const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const StudentDocument = require('../models/StudentDocument');
const { DOCUMENT_TYPES } = require('../models/StudentDocument');
const Group = require('../models/Group');
const supabase = require('../config/supabase');

// Returns true if any group the student belongs to has wroDocumentsRequired=true on its course
async function studentHasWroAccess(studentId) {
  const mongoose = require('mongoose');
  const id = mongoose.Types.ObjectId.isValid(studentId)
    ? new mongoose.Types.ObjectId(studentId.toString())
    : studentId;

  const groups = await Group.find({ students: id })
    .populate({ path: 'courseId', select: 'wroDocumentsRequired title' });

  console.log('[WRO] studentId:', id.toString(), '| groups found:', groups.length);
  groups.forEach((g) => console.log('  [WRO] group:', g._id, '| course:', g.courseId?._id, '| wroDocumentsRequired:', g.courseId?.wroDocumentsRequired));

  return groups.some((g) => g?.courseId?.wroDocumentsRequired === true);
}

const DOCUMENTS_BUCKET = 'documents';

// @desc    Upload or replace a government document
// @route   POST /api/student/documents
// @access  Private (Student)
exports.uploadDocument = asyncHandler(async (req, res) => {
  if (req.user.role !== 'student') {
    throw new AppError('Only students can upload documents', 403);
  }

  const hasAccess = await studentHasWroAccess(req.user._id);
  if (!hasAccess) {
    throw new AppError('WRO document submission is not required for your course', 403);
  }

  if (!supabase) {
    throw new AppError('File storage is not configured', 503);
  }

  if (!req.file) {
    throw new AppError('Document file is required', 400);
  }

  const { documentType } = req.body;
  if (!documentType || !DOCUMENT_TYPES.includes(documentType)) {
    throw new AppError(`Invalid document type. Allowed: ${DOCUMENT_TYPES.join(', ')}`, 400);
  }

  const studentId = req.user._id.toString();
  const ext = req.file.originalname.split('.').pop()?.toLowerCase() || 'bin';
  const storagePath = `documents/${studentId}/${documentType}_${Date.now()}.${ext}`;

  // Delete existing document of same type if any
  const existing = await StudentDocument.findOne({ studentId: req.user._id, documentType });
  if (existing) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([existing.storagePath]);
    await StudentDocument.deleteOne({ _id: existing._id });
  }

  // Upload to Supabase
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });

  if (error) {
    if (error.message?.includes('already exists') || error.statusCode === 409) {
      throw new AppError('File already exists, please try again', 409);
    }
    throw new AppError(`Failed to upload document: ${error.message}`, 500);
  }

  // Build public URL from storage path
  const { data: urlData } = supabase.storage.from(DOCUMENTS_BUCKET).getPublicUrl(storagePath);
  const fileUrl = urlData?.publicUrl || storagePath;

  const doc = await StudentDocument.create({
    studentId: req.user._id,
    documentType,
    fileUrl,
    storagePath,
    originalName: req.file.originalname,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    verificationStatus: 'pending',
  });

  res.status(201).json({ success: true, data: doc });
});

// @desc    Get all own documents
// @route   GET /api/student/documents
// @access  Private (Student)
exports.getDocuments = asyncHandler(async (req, res) => {
  if (req.user.role !== 'student') {
    throw new AppError('Access denied', 403);
  }

  const wroRequired = await studentHasWroAccess(req.user._id);
  const docs = await StudentDocument.find({ studentId: req.user._id })
    .populate('verifiedBy', 'name')
    .sort({ documentType: 1 });

  res.json({ success: true, wroRequired, data: docs });
});

// @desc    Debug WRO access for current student (shows group→course chain)
// @route   GET /api/student/documents/debug-wro
// @access  Private (Student)
exports.debugWroAccess = asyncHandler(async (req, res) => {
  const mongoose = require('mongoose');
  const id = mongoose.Types.ObjectId.isValid(req.user._id)
    ? new mongoose.Types.ObjectId(req.user._id.toString())
    : req.user._id;

  const groups = await Group.find({ students: id })
    .populate({ path: 'courseId', select: 'wroDocumentsRequired title status' });

  const result = groups.map((g) => ({
    groupId: g._id,
    groupName: g.name,
    courseId: g.courseId?._id,
    courseTitle: g.courseId?.title,
    courseStatus: g.courseId?.status,
    wroDocumentsRequired: g.courseId?.wroDocumentsRequired,
  }));

  const hasAccess = result.some((r) => r.wroDocumentsRequired === true);

  res.json({
    success: true,
    studentId: id,
    hasWroAccess: hasAccess,
    groups: result,
  });
});

exports.deleteDocument = asyncHandler(async (req, res) => {
  if (req.user.role !== 'student') {
    throw new AppError('Access denied', 403);
  }

  const doc = await StudentDocument.findOne({
    _id: req.params.docId,
    studentId: req.user._id,
  });

  if (!doc) {
    throw new AppError('Document not found', 404);
  }

  if (doc.verificationStatus !== 'pending') {
    throw new AppError('Only pending documents can be deleted', 400);
  }

  if (supabase) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([doc.storagePath]);
  }

  await StudentDocument.deleteOne({ _id: doc._id });

  res.json({ success: true, message: 'Document deleted' });
});
