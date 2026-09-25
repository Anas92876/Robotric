const express = require('express');
const router  = express.Router();
const { requireAuth, requireDriver } = require('../middleware/auth');
const ctrl = require('../controllers/transport.driver.controller');

router.use(requireAuth, requireDriver);

// Profile
router.get('/profile',  ctrl.getProfile);
router.patch('/profile', ctrl.updateProfile);

// My students & schedule
router.get('/my-students', ctrl.getMyStudents);
router.get('/schedule',    ctrl.getSchedule);

// Map data
router.get('/map-data', ctrl.getMapData);

// Monthly earnings
router.get('/earnings/monthly', ctrl.getMonthlyEarnings);

// Trips
router.get('/trips/today',   ctrl.getTodayTrips);
router.get('/trips/:id',     ctrl.getTrip);
router.patch('/trips/:id/start',    ctrl.startTrip);
router.patch('/trips/:id/complete', ctrl.completeTrip);
router.patch('/trips/:id/cancel',   ctrl.cancelTrip);
router.patch('/trips/:id/location', ctrl.updateLocation);
router.patch('/trips/:id/students/:studentId/status', ctrl.updateStudentStatus);

module.exports = router;
