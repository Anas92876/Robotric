const express = require('express');
const router = express.Router();
const { getAppVersion } = require('../controllers/settings.controller');

// Public — no auth required (mobile app calls this before login)
router.get('/', getAppVersion);

module.exports = router;
