const JobApplication = require('../models/JobApplication');
const asyncHandler = require('../utils/asyncHandler');
const { BadRequestError, NotFoundError, AppError } = require('../utils/errors');
const supabase = require('../config/supabase');

/**
 * Submit job application (Public)
 * POST /api/jobs/apply  — multipart/form-data
 */
exports.submitApplication = asyncHandler(async (req, res) => {
  const {
    position,
    fullName,
    phone,
    email,
    age,
    location,
    gender,
    experienceLevel,
    experienceDetails,
    skills,
    portfolioLink,
    availability,
    whyUs,
    additionalInfo
  } = req.body;

  if (!fullName?.trim() || !phone?.trim() || !position?.trim()) {
    throw new BadRequestError('Full name, phone, and position are required');
  }

  const phoneRegex = /^[0-9+\-\s()]{7,}$/;
  if (!phoneRegex.test(phone.trim())) {
    throw new BadRequestError('Invalid phone number format');
  }

  if (email?.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new BadRequestError('Invalid email address format');
    }
  }

  // Parse skills — sent as JSON string or repeated field
  let parsedSkills = [];
  if (skills) {
    if (typeof skills === 'string') {
      try { parsedSkills = JSON.parse(skills); } catch { parsedSkills = [skills]; }
    } else if (Array.isArray(skills)) {
      parsedSkills = skills;
    }
  }

  // ── Optional CV upload ────────────────────────────────────
  let cvUrl = '';
  let cvBucket = '';

  if (req.file) {
    if (!supabase) {
      throw new AppError('File storage is not configured. Submit without a CV or contact support.', 503);
    }

    const bucket = process.env.SUPABASE_BUCKET || 'resources';
    const now = new Date();
    const monthSlug = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const positionSlug = position.trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06ff]+/g, '-')
      .substring(0, 60);
    const sanitizedName = req.file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, '-')
      .toLowerCase()
      .substring(0, 80);
    const storagePath = `cvs/${positionSlug}/${monthSlug}/${Date.now()}-${sanitizedName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, req.file.buffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError || !uploadData) {
      throw new AppError(`Failed to upload CV: ${uploadError?.message || 'Unknown error'}`, 500);
    }

    cvUrl = storagePath;
    cvBucket = bucket;
  }

  const application = await JobApplication.create({
    position:          position.trim(),
    fullName:          fullName.trim(),
    phone:             phone.trim(),
    email:             email?.trim() || '',
    age:               age ? parseInt(age) : undefined,
    location:          location?.trim() || '',
    gender:            gender || null,
    experienceLevel:   experienceLevel || null,
    experienceDetails: experienceDetails?.trim() || '',
    skills:            parsedSkills.map(s => String(s).trim()).filter(Boolean),
    portfolioLink:     portfolioLink?.trim() || '',
    availability:      availability || null,
    whyUs:             whyUs?.trim() || '',
    additionalInfo:    additionalInfo?.trim() || '',
    cvUrl,
    cvBucket,
  });

  res.status(201).json({
    success: true,
    message: 'Application submitted successfully',
    data: {
      id: application._id,
      fullName: application.fullName,
      position: application.position,
      hasCv: !!cvUrl,
      createdAt: application.createdAt
    }
  });
});

/**
 * Get all applications (Reception only)
 * GET /api/reception/job-applications
 */
exports.getAllApplications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, position, search, fromDate, toDate } = req.query;

  const filter = {};
  if (status)   filter.status = status;
  if (position) filter.position = { $regex: position, $options: 'i' };

  if (search) {
    filter.$or = [
      { fullName:  { $regex: search, $options: 'i' } },
      { phone:     { $regex: search, $options: 'i' } },
      { email:     { $regex: search, $options: 'i' } },
      { location:  { $regex: search, $options: 'i' } },
      { position:  { $regex: search, $options: 'i' } }
    ];
  }

  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate)   filter.createdAt.$lte = new Date(toDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [applications, total, stats] = await Promise.all([
    JobApplication.find(filter)
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    JobApplication.countDocuments(filter),
    JobApplication.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ]);

  const statsMap = { total: 0, new: 0, reviewed: 0, interview: 0, accepted: 0, rejected: 0 };
  stats.forEach(s => { if (s._id in statsMap) statsMap[s._id] = s.count; });
  statsMap.total = await JobApplication.countDocuments({});

  const positions = await JobApplication.distinct('position');

  res.json({
    success: true,
    data: applications,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      limit: parseInt(limit)
    },
    stats: statsMap,
    positions
  });
});

/**
 * Get single application (Reception only)
 * GET /api/reception/job-applications/:id
 */
exports.getApplicationById = asyncHandler(async (req, res) => {
  const application = await JobApplication.findById(req.params.id)
    .populate('reviewedBy', 'name email');
  if (!application) throw new NotFoundError('Job application');
  res.json({ success: true, data: application });
});

/**
 * Update status / HR notes (Reception only)
 * PUT /api/reception/job-applications/:id
 */
exports.updateApplication = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const updateData = {};

  if (status) {
    updateData.status = status;
    updateData.reviewedBy = req.user._id;
    updateData.reviewedAt = new Date();
  }
  if (notes !== undefined) updateData.notes = notes;

  const application = await JobApplication.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).populate('reviewedBy', 'name email');

  if (!application) throw new NotFoundError('Job application');

  res.json({ success: true, message: 'Application updated successfully', data: application });
});

/**
 * Delete application (Reception only)
 * DELETE /api/reception/job-applications/:id
 */
exports.deleteApplication = asyncHandler(async (req, res) => {
  const application = await JobApplication.findByIdAndDelete(req.params.id);
  if (!application) throw new NotFoundError('Job application');

  // Clean up CV from storage if present
  if (application.cvUrl && application.cvBucket && supabase) {
    await supabase.storage.from(application.cvBucket).remove([application.cvUrl]);
  }

  res.json({ success: true, message: 'Application deleted successfully' });
});

/**
 * Generate signed download URL for CV (Reception only)
 * GET /api/reception/job-applications/:id/cv
 */
exports.downloadCv = asyncHandler(async (req, res) => {
  const application = await JobApplication.findById(req.params.id).select('cvUrl cvBucket fullName position createdAt');
  if (!application) throw new NotFoundError('Job application');
  if (!application.cvUrl) throw new NotFoundError('No CV attached to this application');

  if (!supabase) throw new AppError('File storage is not configured', 503);

  const bucket = application.cvBucket || process.env.SUPABASE_BUCKET || 'resources';
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(application.cvUrl, 3600);

  if (error || !data) {
    throw new AppError('Failed to generate CV download link', 500);
  }

  // Build a clean filename: "Position - Full Name - Date.pdf"
  const dateStr = new Date(application.createdAt).toISOString().slice(0, 10);
  const cleanName = `${application.position} - ${application.fullName} - ${dateStr}.pdf`
    .replace(/[/\\?%*:|"<>]/g, '-');

  res.json({
    success: true,
    data: {
      signedUrl: data.signedUrl,
      filename: cleanName,
      expiresIn: 3600
    }
  });
});
