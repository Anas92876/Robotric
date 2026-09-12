const express = require('express');
const router  = express.Router();
const { requireAuth, requireReception } = require('../middleware/auth');
const ctrl = require('../controllers/reception.transport.controller');

router.use(requireAuth, requireReception);

// Students (transport enrollment)
router.get('/students',        ctrl.listStudents);
router.post('/students',       ctrl.enrollStudent);
// Bulk lookup — used by enrollment list to render "Transport pending" banners.
// Must be declared before /students/:id so the path matches correctly.
router.post('/students/status-by-students', ctrl.lookupAssignmentByStudents);
// Pending-assignment count for the reception dashboard summary card.
router.get('/pending-assignment-count', ctrl.countPendingTransportAssignments);
router.patch('/students/:id',  ctrl.updateStudent);
router.delete('/students/:id', ctrl.removeStudent);

// Cost estimate & academy location
router.post('/cost-estimate',    ctrl.costEstimate);
router.get('/academy-location',  ctrl.getAcademyLocation);
router.patch('/academy-location', ctrl.setAcademyLocation);

// Drivers
router.get('/drivers',         ctrl.listDrivers);
router.post('/drivers',        ctrl.createDriver);
router.patch('/drivers/:id',   ctrl.updateDriver);
router.delete('/drivers/:id',  ctrl.removeDriver);

// Trips
router.get('/trips',           ctrl.listTrips);
router.post('/trips',          ctrl.createTrip);
router.patch('/trips/:id',     ctrl.updateTrip);
router.delete('/trips/:id',    ctrl.removeTrip);

// Trip auto-generation (trigger manually or from scheduler)
router.post('/trips/generate', ctrl.generateTrips);

module.exports = router;
