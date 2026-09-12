const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { updateAppVersionSettings } = require('../controllers/settings.controller');

router.use(protect);
router.use(restrictTo('admin', 'superadmin', 'cto'));

// PUT /api/admin/settings/version
router.put('/', updateAppVersionSettings);

module.exports = router;
