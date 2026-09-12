const express = require('express');
const router  = express.Router();
const { requireAuth, requireRoles } = require('../middleware/auth');
const ctrl = require('../controllers/management.transport.controller');

const requireManagement = requireRoles('cto', 'superadmin', 'admin');

router.use(requireAuth, requireManagement);

// Pricing
router.get('/pricing',              ctrl.listPricing);
router.post('/pricing',             ctrl.createPricing);
router.patch('/pricing/:id',        ctrl.updatePricing);
router.patch('/pricing/:id/activate', ctrl.activatePricing);

// Earnings & overview
router.get('/earnings/monthly', ctrl.getMonthlyEarnings);
router.get('/overview',         ctrl.getOverview);

// Trip feedback (read-only; students submit on the student routes)
router.get('/feedback/stats', ctrl.getFeedbackStats); // before /:id so it isn't swallowed
router.get('/feedback/:id',   ctrl.getFeedbackById);
router.get('/feedback',       ctrl.listFeedback);

module.exports = router;
