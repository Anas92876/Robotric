// Route optimization & actual-route-distance for trips.
//
// Two responsibilities:
//
//   1. optimizeTripOrder(snapshot, direction)
//      Compute the order in which the driver should visit students, plus the
//      total km of that route. Asks Google Directions to optimize. Both
//      directions start at RoboTrick:
//        - to_academy   (round-trip): farthest student first → ... → RoboTrick
//        - from_academy (one-way):    nearest student first → ... → farthest
//
//   2. computeActualRouteKm(snapshot, direction)
//      For a trip whose visit order is already locked in, ask Google for the
//      real road distance via a single Directions call. No re-optimisation.
//      Used to self-heal trips whose km wasn't captured at start time.
//
// totalRouteKm is ALWAYS the Google answer. We never substitute haversine for
// the trip total — that's the wrong number that double-counts shared roads.

const haversineKm = require('../utils/haversine');
const { optimizeRoute, getDirectionsRouteKm } = require('../utils/googleRouting');
const { getAcademyLocation } = require('./transport.academy');

// ── Helpers ────────────────────────────────────────────────────────────────

function studentsWithLocation(snapshot) {
  return snapshot.filter(s => s.homeLocation?.lat && s.homeLocation?.lng);
}

function toWaypoints(students) {
  return students.map(s => ({ lat: s.homeLocation.lat, lng: s.homeLocation.lng }));
}

function indexOfFarthest(waypoints, from) {
  let idx = 0;
  let max = -1;
  for (let i = 0; i < waypoints.length; i++) {
    const d = haversineKm(from.lat, from.lng, waypoints[i].lat, waypoints[i].lng);
    if (d > max) { max = d; idx = i; }
  }
  return idx;
}

// ── Direction handlers ─────────────────────────────────────────────────────

/**
 * Morning pickup: round-trip starting and ending at RoboTrick.
 * Google's optimiser returns the cheapest round-trip order; we reverse it so
 * the driver physically visits the FARTHEST student first and the route
 * collapses inward toward the academy.
 */
async function optimizeToAcademy(waypoints, academy) {
  const { order, totalRouteKm } = await optimizeRoute(academy, waypoints, academy);
  const finalOrder = order.length > 1 ? [...order].reverse() : order;
  return { order: finalOrder, totalRouteKm };
}

/**
 * Afternoon dropoff: one-way trip ending at the student farthest from RoboTrick.
 * We lock that student as the destination and let Google optimise the order of
 * the remaining students between RoboTrick and the endpoint. The trip does NOT
 * return to RoboTrick.
 */
async function optimizeFromAcademy(waypoints, academy) {
  if (waypoints.length === 1) {
    return { order: [0], totalRouteKm: null }; // Caller will compute via getDirectionsRouteKm if needed.
  }

  const farthestIdx = indexOfFarthest(waypoints, academy);
  const endpoint = waypoints[farthestIdx];

  // Track original indices so we can recover studentIds after Google's reorder.
  const intermediates = [];
  const originalIdx = [];
  for (let i = 0; i < waypoints.length; i++) {
    if (i === farthestIdx) continue;
    intermediates.push(waypoints[i]);
    originalIdx.push(i);
  }

  const { order, totalRouteKm } = await optimizeRoute(academy, intermediates, endpoint);

  // Final visit order: nearest → ... → farthest (endpoint).
  return {
    order: [...order.map(i => originalIdx[i]), farthestIdx],
    totalRouteKm,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Compute the visit order + total km for a trip's students.
 * @returns { order: studentIds[], totalRouteKm: number | null }
 */
async function optimizeTripOrder(studentsSnapshot, direction) {
  const academy = await getAcademyLocation();
  const students = studentsWithLocation(studentsSnapshot);

  if (students.length === 0) {
    return { order: studentsSnapshot.map(s => s.studentId), totalRouteKm: null };
  }

  const waypoints = toWaypoints(students);
  const academyPoint = { lat: academy.lat, lng: academy.lng };

  const { order, totalRouteKm } = direction === 'to_academy'
    ? await optimizeToAcademy(waypoints, academyPoint)
    : await optimizeFromAcademy(waypoints, academyPoint);

  return {
    order: order.map(i => students[i].studentId),
    totalRouteKm,
  };
}

/**
 * Single Google Directions call for the actual road distance of a trip whose
 * visit order is already locked in (snapshot.pickupOrder is authoritative).
 * Returns null if Google is unreachable — caller must handle that.
 */
async function computeActualRouteKm(studentsSnapshot, direction) {
  const academy = await getAcademyLocation();
  const ordered = [...studentsWithLocation(studentsSnapshot)]
    .sort((a, b) => (a.pickupOrder || 0) - (b.pickupOrder || 0));
  if (ordered.length === 0) return null;

  const waypoints = toWaypoints(ordered);
  const academyPoint = { lat: academy.lat, lng: academy.lng };

  let origin, destination, intermediates;
  if (direction === 'to_academy') {
    origin        = academyPoint;
    destination   = academyPoint;
    intermediates = waypoints;
  } else {
    origin        = academyPoint;
    destination   = waypoints[waypoints.length - 1];
    intermediates = waypoints.slice(0, -1);
  }

  return getDirectionsRouteKm(origin, intermediates, destination);
}

module.exports = { optimizeTripOrder, computeActualRouteKm };
