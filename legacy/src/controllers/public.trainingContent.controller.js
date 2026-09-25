const TrainingPageContent = require('../models/TrainingPageContent');

/**
 * GET /api/public/training-content
 * Public, no-auth endpoint. Returns both AR and EN documents in one call.
 * Either may be null if not yet saved by the CLO.
 */
exports.getPublicContent = async (req, res) => {
  try {
    const [ar, en] = await Promise.all([
      TrainingPageContent.findOne({ lang: 'ar' }).lean(),
      TrainingPageContent.findOne({ lang: 'en' }).lean(),
    ]);

    res.status(200).json({ success: true, data: { ar: ar || null, en: en || null } });
  } catch (error) {
    console.error('getPublicContent error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch training page content' });
  }
};
