const express = require('express');
const router = express.Router();
const { protect, requireCLO } = require('../middleware/auth');
const { generateGroupCertificates, deleteGroupCertificates } = require('../controllers/certificate.controller');

// POST /api/clo/certificates/generate-group/:groupId
router.post('/generate-group/:groupId', protect, requireCLO, generateGroupCertificates);

// DELETE /api/clo/certificates/group/:groupId
router.delete('/group/:groupId', protect, requireCLO, deleteGroupCertificates);

module.exports = router;
