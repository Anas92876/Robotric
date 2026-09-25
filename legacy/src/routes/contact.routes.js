const express = require('express');
const {
  submitContact
} = require('../controllers/contact.controller');
const { validate } = require('../middleware/validate');
const { submitContactSchema } = require('../validations/contact.validations');

const router = express.Router();

// Public route - Submit contact form
router.post('/', validate(submitContactSchema), submitContact);

module.exports = router;
