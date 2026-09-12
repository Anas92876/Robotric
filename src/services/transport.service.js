// Transport service — barrel module.
//
// The transport feature's service-layer logic lives in focused sibling files:
//
//   transport.academy.js       — academy coords + cache
//   transport.pricing.js       — distance/fee math + driver earnings
//   transport.snapshot.js      — immutable trip snapshot builders
//   transport.routing.js       — route order optimization + actual km
//   transport.notifications.js — push + persisted notification records
//
// Existing controllers/tests/schedulers all import from this barrel:
//   const { calculateDistance, optimizeTripOrder, ... } = require('./transport.service');
//
// Keep this file a pure re-export so consumers don't have to update imports.

const academy       = require('./transport.academy');
const pricing       = require('./transport.pricing');
const snapshot      = require('./transport.snapshot');
const routing       = require('./transport.routing');
const notifications = require('./transport.notifications');

module.exports = {
  // academy
  getAcademyLocation:        academy.getAcademyLocation,
  invalidateAcademyCache:    academy.invalidateAcademyCache,

  // pricing & fees
  calculateDistance:         pricing.calculateDistance,
  calculateStudentMonthlyFee: pricing.calculateStudentMonthlyFee,
  resolveDriverRatePerKm:    pricing.resolveDriverRatePerKm,
  calculateTripDriverEarnings: pricing.calculateTripDriverEarnings,
  estimateSessionsPerMonth:  pricing.estimateSessionsPerMonth,

  // snapshot
  buildTripSnapshot:         snapshot.buildTripSnapshot,
  buildInitialStudentStatuses: snapshot.buildInitialStudentStatuses,

  // routing
  optimizeTripOrder:         routing.optimizeTripOrder,
  computeActualRouteKm:      routing.computeActualRouteKm,

  // notifications
  notifyTripStudents:        notifications.notifyTripStudents,
  notifySingleStudent:       notifications.notifySingleStudent,
};
