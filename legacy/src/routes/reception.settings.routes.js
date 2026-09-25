/**
 * Reception Settings Routes
 * Exchange rate and other reception-editable settings
 */

const express = require('express');
const router = express.Router();
const { protect, requireReception } = require('../middleware/auth');
const { getExchangeRate, updateExchangeRate } = require('../controllers/settings.controller');

// All routes require authentication and reception role
router.use(protect);
router.use(requireReception);

// GET /api/reception/settings/exchange-rate
router.get('/exchange-rate', getExchangeRate);

// PUT /api/reception/settings/exchange-rate
router.put('/exchange-rate', updateExchangeRate);

module.exports = router;
