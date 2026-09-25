/**
 * Certificate Controller
 *
 * POST /api/clo/certificates/generate-group/:groupId  — CLO bulk-issues certs for all students
 * GET  /api/student/certificates                       — Student fetches their certs
 * GET  /api/certificates/verify/:certNumber            — Public verification (no auth)
 */

const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const Certificate = require('../models/Certificate');
const Group       = require('../models/Group');
const Course      = require('../models/Course');
const User        = require('../models/User');
const Lead        = require('../models/Lead');
const { generateCertificatePDF } = require('../utils/certificateGenerator');
const path = require('path');
const fs   = require('fs');

// Resolve English name and gender from Lead.
// Returns { name, gender } or { name: null } if not found.
const resolveLeadInfo = async (student) => {
  try {
    let lead = await Lead.findOne({ convertedToStudent: student._id })
      .select('englishName gender').lean();

    if (!lead) {
      lead = await Lead.findOne({ fullName: student.name })
        .select('englishName gender').lean();
    }

    if (lead?.englishName?.trim()) {
      return {
        name:   lead.englishName.trim(),
        gender: lead.gender === 'female' ? 'female' : 'male',
      };
    }
  } catch {}
  return { name: null, gender: 'male' };
};

// ─── CLO: Bulk-generate certificates for all students in a group ──────────────
exports.generateGroupCertificates = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const issuedBy = req.user._id;

  const group = await Group.findById(groupId)
    .populate('students', 'name email')
    .populate('courseId', 'title level')
    .lean();

  if (!group) throw new AppError('Group not found', 404);

  if (!group.students || group.students.length === 0) {
    return res.status(200).json({
      success: true,
      issued: 0,
      skipped: 0,
      certificates: [],
      message: 'No students in this group',
    });
  }

  const course = group.courseId;
  if (!course) throw new AppError('Group has no associated course', 400);

  // Re-fetch course with totalHours + duration (duration is fallback)
  const courseDoc = await Course.findById(course._id).select('title level totalHours duration').lean();

  const parseDuration = (str) => {
    if (!str) return 0;
    const m = String(str).match(/(\d+\.?\d*)/);
    return m ? parseFloat(m[1]) : 0;
  };

  const trainingHours = courseDoc?.totalHours || parseDuration(courseDoc?.duration) || 0;
  const hoursWarning = !trainingHours
    ? `Course "${courseDoc?.title}" has no training hours set — certificates will show 0 hours. Please set "Total Hours" on the course before generating.`
    : null;

  const issuedAt = new Date();
  const results = [];
  let skipped = 0;

  for (const student of group.students) {
    // Skip if already has a cert for this group
    const existing = await Certificate.findOne({
      student: student._id,
      group: groupId,
    });

    if (existing) {
      // Patch snapshot if hours were missing when originally generated
      if (!existing.snapshot.trainingHours && trainingHours) {
        await Certificate.updateOne(
          { _id: existing._id },
          { $set: { 'snapshot.trainingHours': trainingHours } }
        );
      }
      skipped++;
      results.push({
        studentId: student._id,
        studentName: existing.snapshot.studentName,
        certificateNumber: existing.certificateNumber,
        alreadyExisted: true,
      });
      continue;
    }

    // English name from Lead is required — skip if not found
    const leadInfo = await resolveLeadInfo(student);

    if (!leadInfo.name) {
      skipped++;
      results.push({
        studentId: student._id,
        studentName: student.name,
        skippedReason: 'No English name found in Lead records',
        alreadyExisted: false,
        skipped: true,
      });
      continue;
    }

    const certNumber = await Certificate.generateCertNumber();

    const cert = await Certificate.create({
      certificateNumber: certNumber,
      student: student._id,
      course: course._id,
      group: groupId,
      issuedBy,
      issuedAt,
      snapshot: {
        studentName:   leadInfo.name,
        courseName:    course.title,
        courseLevel:   course.level || '',
        trainingHours,
        gender:        leadInfo.gender,
      },
    });

    results.push({
      studentId: student._id,
      studentName: leadInfo.name,
      certificateNumber: cert.certificateNumber,
      alreadyExisted: false,
      skipped: false,
    });
  }

  const newlyIssued = results.filter(r => !r.alreadyExisted).length;

  res.status(201).json({
    success: true,
    issued: newlyIssued,
    skipped,
    certificates: results,
    issuedAt: issuedAt.toISOString(),
    warning: hoursWarning || undefined,
  });
});

// ─── Student: fetch their certificates ────────────────────────────────────────
exports.getStudentCertificates = asyncHandler(async (req, res) => {
  const studentId = req.user._id;

  const certs = await Certificate.find({ student: studentId })
    .sort({ issuedAt: -1 })
    .populate('course', 'title level category totalHours duration')
    .lean();

  const parseDuration = (str) => {
    if (!str) return 0;
    const m = String(str).match(/(\d+\.?\d*)/);
    return m ? parseFloat(m[1]) : 0;
  };

  // Heal trainingHours from live course data for any cert that has 0
  const healed = [];
  for (const c of certs) {
    let trainingHours = c.snapshot.trainingHours || 0;
    if (!trainingHours) {
      // c.course is the populated object (from .populate); get hours directly
      const pop = c.course;
      if (pop) {
        trainingHours = (pop.totalHours || 0) || parseDuration(pop.duration) || 0;
      }
      if (trainingHours) {
        await Certificate.updateOne({ _id: c._id }, { $set: { 'snapshot.trainingHours': trainingHours } });
      }
    }
    healed.push({ ...c, _healedHours: trainingHours });
  }

  res.json({
    success: true,
    count: healed.length,
    data: healed.map(c => ({
      _id: c._id,
      certificateNumber: c.certificateNumber,
      issuedAt:      c.issuedAt,
      studentName:   c.snapshot.studentName,
      courseName:    c.snapshot.courseName,
      courseLevel:   c.snapshot.courseLevel,
      trainingHours: c._healedHours,
      gender:        c.snapshot.gender || 'male',
      course:        c.course,
    })),
  });
});

// ─── CLO: Delete all certificates for a group ────────────────────────────────
exports.deleteGroupCertificates = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const result = await Certificate.deleteMany({ group: groupId });

  // Also remove cached PDFs for this group's certs
  try {
    const uploadsDir = path.join(__dirname, '../../uploads/certificates');
    if (fs.existsSync(uploadsDir)) {
      // We don't know the cert numbers anymore (deleted), so skip file cleanup
      // Files will be regenerated on next download if somehow re-issued
    }
  } catch {}

  res.json({
    success: true,
    deleted: result.deletedCount,
    message: `${result.deletedCount} certificate(s) deleted`,
  });
});

// ─── Student: download certificate as PDF ────────────────────────────────────
exports.downloadCertificatePDF = asyncHandler(async (req, res) => {
  const { certNumber } = req.params;
  const studentId = req.user._id;

  const cert = await Certificate.findOne({
    certificateNumber: certNumber,
    student: studentId,
  });

  if (!cert) throw new AppError('Certificate not found', 404);

  // Heal snapshot hours if missing — read live from course
  let trainingHours = cert.snapshot.trainingHours || 0;
  if (!trainingHours && cert.course) {
    const courseDoc = await Course.findById(cert.course).select('totalHours duration').lean();
    if (courseDoc) {
      const parseDuration = (str) => {
        if (!str) return 0;
        const m = String(str).match(/(\d+\.?\d*)/);
        return m ? parseFloat(m[1]) : 0;
      };
      trainingHours = courseDoc.totalHours || parseDuration(courseDoc.duration) || 0;
      if (trainingHours) {
        await Certificate.updateOne({ _id: cert._id }, { $set: { 'snapshot.trainingHours': trainingHours } });
      }
    }
  }

  const uploadsDir = path.join(__dirname, '../../uploads/certificates');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const fileName = `${certNumber}.pdf`;
  const pdfPath  = path.join(uploadsDir, fileName);

  // Always regenerate to pick up template updates
  await generateCertificatePDF({
    certificateNumber: cert.certificateNumber,
    studentName:   cert.snapshot.studentName,
    courseName:    cert.snapshot.courseName,
    courseLevel:   cert.snapshot.courseLevel || '',
    trainingHours,
    issuedAt:      cert.issuedAt,
    gender:        cert.snapshot.gender || 'male',
  }, pdfPath);

  const fileSize = fs.statSync(pdfPath).size;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Length', fileSize);
  res.setHeader('Cache-Control', 'no-cache');

  const stream = fs.createReadStream(pdfPath);
  stream.pipe(res);
});

// ─── Public: verify a certificate by number ───────────────────────────────────
exports.verifyCertificate = asyncHandler(async (req, res) => {
  const certNumber = req.params.certNumber.toUpperCase();

  const cert = await Certificate.findOne({ certificateNumber: certNumber })
    .populate('course', 'title level category')
    .populate('issuedBy', 'name')
    .lean();

  if (!cert) {
    return res.status(404).json({
      success: false,
      valid: false,
      message: 'Certificate not found',
    });
  }

  res.json({
    success: true,
    valid: true,
    certificate: {
      certificateNumber: cert.certificateNumber,
      studentName:   cert.snapshot.studentName,
      courseName:    cert.snapshot.courseName,
      courseLevel:   cert.snapshot.courseLevel,
      trainingHours: cert.snapshot.trainingHours || 0,
      gender:        cert.snapshot.gender || 'male',
      issuedAt:      cert.issuedAt,
      issuedBy:      cert.issuedBy?.name || 'Robotrick',
      course:        cert.course,
    },
  });
});
