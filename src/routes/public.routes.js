const express = require('express');
const router = express.Router();
const { getPublicContent } = require('../controllers/public.trainingContent.controller');

// GET /api/public/training-content — no auth required
router.get('/training-content', getPublicContent);

module.exports = router;
