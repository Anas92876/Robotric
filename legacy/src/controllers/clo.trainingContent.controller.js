const TrainingPageContent = require('../models/TrainingPageContent');
const { uploadImage, deleteImage } = require('../services/cloudinary.service');

const VALID_TRACKS = ['summer', 'winter', 'competitions'];

function getProgramsArray(doc, trackId) {
  return doc.tracks?.[trackId]?.programs;
}

/**
 * GET /api/clo/training-content/:lang
 */
exports.getContent = async (req, res) => {
  try {
    const { lang } = req.params;
    if (!['ar', 'en'].includes(lang)) {
      return res.status(400).json({ success: false, message: 'lang must be "ar" or "en"' });
    }
    const doc = await TrainingPageContent.findOne({ lang });
    res.status(200).json({ success: true, data: doc || null });
  } catch (error) {
    console.error('getContent error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch training page content' });
  }
};

/**
 * PUT /api/clo/training-content/:lang
 */
exports.upsertContent = async (req, res) => {
  try {
    const { lang } = req.params;
    if (!['ar', 'en'].includes(lang)) {
      return res.status(400).json({ success: false, message: 'lang must be "ar" or "en"' });
    }

    const { statsValues, tracks } = req.body;

    const doc = await TrainingPageContent.findOneAndUpdate(
      { lang },
      { $set: { statsValues, tracks } },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({ success: true, message: 'Training page content saved', data: doc });
  } catch (error) {
    console.error('upsertContent error:', error);
    res.status(500).json({ success: false, message: 'Failed to save training page content' });
  }
};

/**
 * POST /api/clo/training-content/programs/:trackId/:programIndex/images
 * Upload image for summer/winter/competitions program. Shared across languages.
 */
exports.uploadProgramImage = async (req, res) => {
  try {
    const { trackId, programIndex } = req.params;
    const idx = parseInt(programIndex, 10);

    if (!VALID_TRACKS.includes(trackId)) {
      return res.status(400).json({ success: false, message: 'Invalid trackId' });
    }
    if (isNaN(idx) || idx < 0) {
      return res.status(400).json({ success: false, message: 'Invalid programIndex' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image provided' });
    }

    const folder = `robotrick/training/${trackId}`;
    const result = await uploadImage(req.file.buffer, folder);
    const newImage = { url: result.secure_url, publicId: result.public_id };

    for (const lang of ['ar', 'en']) {
      const doc = await TrainingPageContent.findOne({ lang });
      if (!doc) continue;
      const programs = getProgramsArray(doc, trackId);
      if (!programs || !programs[idx]) continue;
      programs[idx].images = programs[idx].images || [];
      programs[idx].images.push(newImage);
      doc.markModified(`tracks.${trackId}.programs`);
      await doc.save();
    }

    res.status(200).json({ success: true, data: newImage });
  } catch (error) {
    console.error('uploadProgramImage error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
};

/**
 * DELETE /api/clo/training-content/programs/:trackId/:programIndex/images/:publicId
 */
exports.deleteProgramImage = async (req, res) => {
  try {
    const { trackId, programIndex, publicId } = req.params;
    const idx = parseInt(programIndex, 10);

    if (!VALID_TRACKS.includes(trackId)) {
      return res.status(400).json({ success: false, message: 'Invalid trackId' });
    }
    if (isNaN(idx) || idx < 0) {
      return res.status(400).json({ success: false, message: 'Invalid programIndex' });
    }

    const decodedPublicId = decodeURIComponent(publicId);
    await deleteImage(decodedPublicId);

    for (const lang of ['ar', 'en']) {
      const doc = await TrainingPageContent.findOne({ lang });
      if (!doc) continue;
      const programs = getProgramsArray(doc, trackId);
      if (!programs || !programs[idx]) continue;
      programs[idx].images = (programs[idx].images || []).filter(i => i.publicId !== decodedPublicId);
      doc.markModified(`tracks.${trackId}.programs`);
      await doc.save();
    }

    res.status(200).json({ success: true, message: 'Image deleted' });
  } catch (error) {
    console.error('deleteProgramImage error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete image' });
  }
};

/**
 * POST /api/clo/training-content/departments/:deptIndex/cover
 * Upload cover image for a yearRound department. Shared across languages.
 */
exports.uploadDepartmentCover = async (req, res) => {
  try {
    const { deptIndex } = req.params;
    const idx = parseInt(deptIndex, 10);

    if (isNaN(idx) || idx < 0) {
      return res.status(400).json({ success: false, message: 'Invalid deptIndex' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image provided' });
    }

    const folder = 'robotrick/training/yearround/departments';
    const result = await uploadImage(req.file.buffer, folder);
    const newImage = { url: result.secure_url, publicId: result.public_id };

    // Delete old cover from Cloudinary if it exists (replace pattern)
    for (const lang of ['ar', 'en']) {
      const doc = await TrainingPageContent.findOne({ lang });
      if (!doc) continue;
      const depts = doc.tracks?.yearRound?.departments;
      if (!depts || !depts[idx]) continue;

      const oldPublicId = depts[idx].coverImage?.publicId;
      if (oldPublicId && lang === 'ar') {
        // Only delete once (ar runs first)
        try { await deleteImage(oldPublicId); } catch (_) {}
      }

      depts[idx].coverImage = newImage;
      doc.markModified('tracks.yearRound.departments');
      await doc.save();
    }

    res.status(200).json({ success: true, data: newImage });
  } catch (error) {
    console.error('uploadDepartmentCover error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload department cover' });
  }
};

/**
 * DELETE /api/clo/training-content/departments/:deptIndex/cover
 */
exports.deleteDepartmentCover = async (req, res) => {
  try {
    const { deptIndex } = req.params;
    const idx = parseInt(deptIndex, 10);

    if (isNaN(idx) || idx < 0) {
      return res.status(400).json({ success: false, message: 'Invalid deptIndex' });
    }

    // Get publicId from ar doc (source of truth for images)
    const arDoc = await TrainingPageContent.findOne({ lang: 'ar' });
    const publicId = arDoc?.tracks?.yearRound?.departments?.[idx]?.coverImage?.publicId;
    if (publicId) {
      try { await deleteImage(publicId); } catch (_) {}
    }

    for (const lang of ['ar', 'en']) {
      const doc = await TrainingPageContent.findOne({ lang });
      if (!doc) continue;
      const depts = doc.tracks?.yearRound?.departments;
      if (!depts || !depts[idx]) continue;
      depts[idx].coverImage = { url: '', publicId: '' };
      doc.markModified('tracks.yearRound.departments');
      await doc.save();
    }

    res.status(200).json({ success: true, message: 'Cover deleted' });
  } catch (error) {
    console.error('deleteDepartmentCover error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete department cover' });
  }
};

/**
 * POST /api/clo/training-content/departments/:deptIndex/programs/:programIndex/images
 * Upload image for a yearRound department program. Shared across languages.
 */
exports.uploadDeptProgramImage = async (req, res) => {
  try {
    const { deptIndex, programIndex } = req.params;
    const di = parseInt(deptIndex, 10);
    const pi = parseInt(programIndex, 10);

    if (isNaN(di) || di < 0 || isNaN(pi) || pi < 0) {
      return res.status(400).json({ success: false, message: 'Invalid index' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image provided' });
    }

    const folder = `robotrick/training/yearround/dept-${di}`;
    const result = await uploadImage(req.file.buffer, folder);
    const newImage = { url: result.secure_url, publicId: result.public_id };

    for (const lang of ['ar', 'en']) {
      const doc = await TrainingPageContent.findOne({ lang });
      if (!doc) continue;
      const depts = doc.tracks?.yearRound?.departments;
      if (!depts?.[di]?.programs?.[pi]) continue;
      depts[di].programs[pi].images = depts[di].programs[pi].images || [];
      depts[di].programs[pi].images.push(newImage);
      doc.markModified('tracks.yearRound.departments');
      await doc.save();
    }

    res.status(200).json({ success: true, data: newImage });
  } catch (error) {
    console.error('uploadDeptProgramImage error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
};

/**
 * DELETE /api/clo/training-content/departments/:deptIndex/programs/:programIndex/images/:publicId
 */
exports.deleteDeptProgramImage = async (req, res) => {
  try {
    const { deptIndex, programIndex, publicId } = req.params;
    const di = parseInt(deptIndex, 10);
    const pi = parseInt(programIndex, 10);

    if (isNaN(di) || di < 0 || isNaN(pi) || pi < 0) {
      return res.status(400).json({ success: false, message: 'Invalid index' });
    }

    const decodedPublicId = decodeURIComponent(publicId);
    await deleteImage(decodedPublicId);

    for (const lang of ['ar', 'en']) {
      const doc = await TrainingPageContent.findOne({ lang });
      if (!doc) continue;
      const depts = doc.tracks?.yearRound?.departments;
      if (!depts?.[di]?.programs?.[pi]) continue;
      depts[di].programs[pi].images = (depts[di].programs[pi].images || [])
        .filter(img => img.publicId !== decodedPublicId);
      doc.markModified('tracks.yearRound.departments');
      await doc.save();
    }

    res.status(200).json({ success: true, message: 'Image deleted' });
  } catch (error) {
    console.error('deleteDeptProgramImage error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete image' });
  }
};
