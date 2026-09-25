// Pricing & fee math for the transport feature.
//
// Three things live here:
//   1. Per-student monthly fee (paid by the student)
//   2. Driver-rate-per-km resolution (tiered by passenger count, with flat fallback)
//   3. Driver earnings for a single completed trip
//
// All functions are pure — no DB, no Google API, no side effects. They take the
// numbers they need and return numbers. This makes them easy to test and reuse.

const haversineKm = require('../utils/haversine');
const { getRoadDistance } = require('../utils/googleRouting');
const { getAcademyLocation } = require('./transport.academy');

// ── Distance ────────────────────────────────────────────────────────────────

/**
 * One-way road distance between a student home and the academy.
 * Returns { distanceKm, rawDistanceKm } — distanceKm is the road distance from
 * Google (falls back to haversine × roadFactor if the API is unavailable);
 * rawDistanceKm is always the haversine straight-line distance, kept around
 * for reference and as a sanity check.
 */
async function calculateDistance(homeLat, homeLng) {
  const academy = await getAcademyLocation();
  const rawKm = parseFloat(haversineKm(homeLat, homeLng, academy.lat, academy.lng).toFixed(2));
  const { roadDistanceKm } = await getRoadDistance(homeLat, homeLng, academy.lat, academy.lng);
  return { distanceKm: roadDistanceKm || rawKm, rawDistanceKm: rawKm };
}

// ── Fees ────────────────────────────────────────────────────────────────────

function roundToNearest25k(value) {
  return Math.ceil(value / 25000) * 25000;
}

/**
 * Monthly fee for a single student.
 *   fee = distanceKm × legMultiplier × sessionsPerMonth × studentRatePerKm
 *
 * Rounded up to the nearest 25,000 SYP so prices look clean.
 */
function calculateStudentMonthlyFee(distanceKm, sessionsPerMonth, pricing) {
  if (!distanceKm || !sessionsPerMonth || !pricing?.studentRatePerKm) return 0;
  const multiplier = pricing.legMultiplier || 3;
  const raw = distanceKm * multiplier * sessionsPerMonth * pricing.studentRatePerKm;
  return roundToNearest25k(raw);
}

// ── Driver rate ─────────────────────────────────────────────────────────────

/**
 * Driver rate per km for a trip, based on how many students were on board.
 * Tiers (if defined on the pricing doc) take priority; otherwise we fall back
 * to the flat driverRatePerKm.
 */
function resolveDriverRatePerKm(studentCount, pricing) {
  const tiers = pricing.driverRateTiers;
  if (tiers && tiers.length > 0) {
    const match = tiers.find(t =>
      studentCount >= t.minStudents &&
      (t.maxStudents == null || studentCount <= t.maxStudents)
    );
    if (match) return match.ratePerKm;
  }
  return pricing.driverRatePerKm;
}

// ── Driver earnings ────────────────────────────────────────────────────────

/**
 * Driver earnings for one completed trip:  actualRouteKm × ratePerKm
 *
 * actualRouteKm MUST be the real Google-reported road distance for the trip
 * (RoboTrick → s0 → ... → RoboTrick / last stop). Returns null if it's missing
 * — we never substitute summed per-student distances, since that double-counts
 * shared roads and overpays the driver.
 */
function calculateTripDriverEarnings(studentsSnapshot, pricing, actualRouteKm = null) {
  if (!studentsSnapshot || !pricing) return null;
  if (actualRouteKm == null || actualRouteKm <= 0) return null;
  const ratePerKm = resolveDriverRatePerKm(studentsSnapshot.length, pricing);
  return parseFloat((actualRouteKm * ratePerKm).toFixed(2));
}

// ── Sessions estimate ──────────────────────────────────────────────────────

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

/**
 * Rough monthly session count from a course's weekly schedule.
 * Counts distinct weekdays in the schedule × 4.33 weeks/month.
 * Returns 0 if no usable schedule was supplied (caller decides what to do).
 */
function estimateSessionsPerMonth(courseSchedule) {
  if (!courseSchedule || courseSchedule.length === 0) return 0;
  const scheduledDays = new Set();
  courseSchedule.forEach(entry => {
    const day = (entry.day || '').toLowerCase();
    if (WEEKDAYS.includes(day)) scheduledDays.add(day);
  });
  return parseFloat((scheduledDays.size * 4.33).toFixed(1));
}

module.exports = {
  calculateDistance,
  calculateStudentMonthlyFee,
  resolveDriverRatePerKm,
  calculateTripDriverEarnings,
  estimateSessionsPerMonth,
};
