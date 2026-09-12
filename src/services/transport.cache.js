// Enrollment.transportation cache synchronisation.
//
// Background
// ──────────
// `DriverStudent` is the authoritative record for a student's bus seat:
// which driver, home location, distance, monthly fee, etc. The Enrollment
// schema mirrors a subset of that state on `transportation.*` so the list
// page can render without joining DriverStudent on every row.
//
// The cache is keyed by STUDENT, not by enrollment — a student has at most
// one active DriverStudent (their seat) shared across all their courses.
// When the seat changes, every transport-enabled enrollment for that student
// must see the new state.
//
// What this module does
// ─────────────────────
// One function: syncEnrollmentTransportCache(studentId, opts?).
//
//   - Reads the student's current active DriverStudent (if any).
//   - Updates every Enrollment row where { student, transportation.enabled=true }
//     to match — or clears the cache fields if no DriverStudent exists anymore.
//
// Call it from the three DriverStudent mutation paths:
//
//   - enrollStudent  (create)        — after DriverStudent.create
//   - updateStudent  (update)        — after ds.save
//   - removeStudent  (soft-delete)   — after ds.isActive=false; ds.save
//
// Failures here are non-fatal — the cache can be rebuilt later, and we'd
// rather complete the user-facing mutation than abort it for a side-effect.

const DriverStudent = require('../models/DriverStudent');
const Enrollment    = require('../models/Enrollment');

/**
 * Build the cache payload from a DriverStudent record. Returns the cleared
 * shape when `ds` is null (i.e. student has no active bus seat).
 *
 * Keep this in lockstep with the schema fields documented in models/Enrollment.js
 * under "CACHE ONLY".
 */
function buildCachePayload(ds, updatedBy = null) {
  if (!ds) {
    return {
      'transportation.homeLocation':       { lat: null, lng: null },
      'transportation.homeAddress':        null,
      'transportation.rawDistanceKm':      null,
      'transportation.roadDistanceKm':     null,
      'transportation.monthlyFeeEstimate': null,
      'transportation.locationUpdatedAt':  null,
      'transportation.locationUpdatedBy':  null,
    };
  }

  return {
    'transportation.homeLocation':       ds.homeLocation || { lat: null, lng: null },
    'transportation.homeAddress':        ds.homeAddress || null,
    // We don't recompute the haversine here — only the road distance is
    // stored on DriverStudent. The cache field name is `rawDistanceKm` but
    // semantically it mirrors the source's `distanceKm`. Setting it to the
    // same value keeps consumers consistent without an extra calculation.
    'transportation.rawDistanceKm':      ds.distanceKm ?? null,
    'transportation.roadDistanceKm':     ds.distanceKm ?? null,
    'transportation.monthlyFeeEstimate': ds.monthlyFee ?? null,
    'transportation.locationUpdatedAt':  ds.updatedAt || new Date(),
    'transportation.locationUpdatedBy':  updatedBy || ds.updatedBy || ds.createdBy || null,
  };
}

/**
 * Reconcile every transport-enabled Enrollment for a student against the
 * current DriverStudent state.
 *
 * @param {string|ObjectId} studentId
 * @param {object}   [opts]
 * @param {string}   [opts.updatedBy]  user id to stamp on locationUpdatedBy
 * @returns {Promise<{ updatedEnrollments: number, hasActiveSeat: boolean }>}
 *
 * Throws are logged and swallowed by callers — this is best-effort cache
 * maintenance, not transactional.
 */
async function syncEnrollmentTransportCache(studentId, opts = {}) {
  if (!studentId) return { updatedEnrollments: 0, hasActiveSeat: false };

  const ds = await DriverStudent
    .findOne({ studentId, isActive: true })
    .lean();

  const payload = buildCachePayload(ds, opts.updatedBy);

  // Only touch enrollments where transport is enabled — leaving non-transport
  // enrollments alone preserves their default-null cache and avoids accidental
  // writes that would dirty unrelated documents.
  const result = await Enrollment.updateMany(
    { student: studentId, 'transportation.enabled': true },
    { $set: payload }
  );

  return {
    updatedEnrollments: result.modifiedCount ?? result.nModified ?? 0,
    hasActiveSeat: !!ds,
  };
}

module.exports = { syncEnrollmentTransportCache };
