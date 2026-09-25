const express = require('express');
const { submitApplication } = require('../controllers/job.application.controller');
const upload = require('../middleware/pdf-upload');

const router = express.Router();

// Public — anyone can submit; CV is optional (field name: "cv")
router.post('/apply', upload.single('cv'), submitApplication);

module.exports = router;
