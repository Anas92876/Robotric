const express = require('express');
const router  = express.Router();
const { requireAuth, requireRoles } = require('../middleware/auth');
const ctrl = require('../controllers/student.transport.controller');

router.use(requireAuth, requireRoles('student'));

router.get('/status',        ctrl.getTransportStatus);
router.get('/driver-info',   ctrl.getDriverInfo);
router.get('/trips/history', ctrl.getTripHistory);
router.patch('/location',    ctrl.updateLocation);

// Per-trip feedback (visible to management only on the read side)
router.get ('/trips/:tripId/feedback', ctrl.getMyTripFeedback);
router.post('/trips/:tripId/feedback', ctrl.submitTripFeedback);

// Pre-enrollment cost calculator — lets a not-yet-enrolled student check the
// monthly fee for their home location before contacting reception.
router.post('/cost-estimate', ctrl.estimateCost);

module.exports = router;
