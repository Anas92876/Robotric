const express = require('express');
const router = express.Router();
const { verifyCertificate } = require('../controllers/certificate.controller');

// GET /api/certificates/verify/:certNumber  — no auth required
router.get('/verify/:certNumber', verifyCertificate);

module.exports = router;
