const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getStudentCertificates, downloadCertificatePDF } = require('../controllers/certificate.controller');

// GET /api/student/certificates
router.get('/', protect, getStudentCertificates);

// GET /api/student/certificates/:certNumber/pdf
router.get('/:certNumber/pdf', protect, downloadCertificatePDF);

module.exports = router;
