const https = require('https');
const haversineKm = require('./haversine');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const ROAD_FACTOR = 1.35;

/**
 * Get real road distance between two coordinates using Google Directions API.
 * Falls back to Haversine × ROAD_FACTOR if API key is missing or request fails.
 */
async function getRoadDistance(originLat, originLng, destLat, destLng) {
  if (!GOOGLE_MAPS_API_KEY) {
    const raw = haversineKm(originLat, originLng, destLat, destLng);
    return { roadDistanceKm: parseFloat((raw * ROAD_FACTOR).toFixed(2)), durationMin: null };
  }

  try {
    const url =
      `https://maps.googleapis.com/maps/api/directions/json` +
      `?origin=${originLat},${originLng}` +
      `&destination=${destLat},${destLng}` +
      `&mode=driving` +
      `&key=${GOOGLE_MAPS_API_KEY}`;

    const body = await fetchJson(url);

    if (body.status !== 'OK') {
      const raw = haversineKm(originLat, originLng, destLat, destLng);
      return { roadDistanceKm: parseFloat((raw * ROAD_FACTOR).toFixed(2)), durationMin: null };
    }

    const leg = body.routes[0].legs[0];
    return {
      roadDistanceKm: parseFloat((leg.distance.value / 1000).toFixed(2)),
      durationMin: Math.round(leg.duration.value / 60),
    };
  } catch {
    const raw = haversineKm(originLat, originLng, destLat, destLng);
    return { roadDistanceKm: parseFloat((raw * ROAD_FACTOR).toFixed(2)), durationMin: null };
  }
}

/**
 * Optimize the order to visit multiple waypoints using Google Directions API.
 *
 * @param {object} origin      - { lat, lng } starting point
 * @param {object[]} waypoints - [{ lat, lng }, ...] stops to visit
 * @param {object} destination - { lat, lng } final destination
 * @returns {number[]} optimizedOrder — indices into the original waypoints array
 *
 * Falls back to nearest-neighbor greedy sort when API is unavailable.
 */
async function optimizeWaypoints(origin, waypoints, destination) {
  const { order } = await optimizeRoute(origin, waypoints, destination);
  return order;
}

/**
 * Like optimizeWaypoints, but also returns the total road distance of the
 * resulting route in one API call.
 *
 * IMPORTANT: totalRouteKm is ONLY populated from Google Directions. If the
 * Maps API is unreachable or returns no route, totalRouteKm is null — we never
 * substitute a haversine guess, since that's the over-counted number the
 * driver complained about. The optimized `order` still falls back to a greedy
 * nearest-neighbor sort so the trip can proceed; only km accuracy is sacrificed.
 *
 * @returns { order: number[], totalRouteKm: number | null }
 */
async function optimizeRoute(origin, waypoints, destination) {
  if (!waypoints || waypoints.length === 0) {
    return { order: [], totalRouteKm: null };
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return { order: nearestNeighborOrder(origin, waypoints), totalRouteKm: null };
  }

  try {
    const wpStr = waypoints
      .map(w => `${w.lat},${w.lng}`)
      .join('|');

    const url =
      `https://maps.googleapis.com/maps/api/directions/json` +
      `?origin=${origin.lat},${origin.lng}` +
      `&destination=${destination.lat},${destination.lng}` +
      `&waypoints=optimize:true|${wpStr}` +
      `&mode=driving` +
      `&key=${GOOGLE_MAPS_API_KEY}`;

    const body = await fetchJson(url);

    if (body.status !== 'OK' || !body.routes[0]) {
      return { order: nearestNeighborOrder(origin, waypoints), totalRouteKm: null };
    }

    const route = body.routes[0];
    const totalMeters = (route.legs || []).reduce((sum, leg) => sum + (leg.distance?.value || 0), 0);
    return {
      order: route.waypoint_order,
      totalRouteKm: totalMeters > 0 ? parseFloat((totalMeters / 1000).toFixed(2)) : null,
    };
  } catch {
    return { order: nearestNeighborOrder(origin, waypoints), totalRouteKm: null };
  }
}

// Greedy nearest-neighbor fallback — O(n²) but n is always small (≤ 10 students)
function nearestNeighborOrder(origin, waypoints) {
  const unvisited = waypoints.map((w, i) => ({ ...w, originalIndex: i }));
  const order = [];
  let current = origin;

  while (unvisited.length > 0) {
    let nearest = null;
    let nearestDist = Infinity;
    let nearestIdx = -1;

    for (let i = 0; i < unvisited.length; i++) {
      const d = haversineKm(current.lat, current.lng, unvisited[i].lat, unvisited[i].lng);
      if (d < nearestDist) { nearestDist = d; nearest = unvisited[i]; nearestIdx = i; }
    }

    order.push(nearest.originalIndex);
    current = nearest;
    unvisited.splice(nearestIdx, 1);
  }

  return order;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Failed to parse Google API response')); }
      });
    }).on('error', reject);
  });
}

/**
 * Get the total road distance (km) of a route through given waypoints in EXACT order,
 * using a single Google Directions API call. Waypoints are NOT re-optimized.
 *
 * Returns:
 *   - a number (km, two decimals) on success
 *   - null if API key is missing OR the API call fails OR the response has no route
 *
 * This is the authoritative "what did the driver actually drive" calculation — no
 * haversine fallback, no fake numbers. Caller must handle null.
 */
async function getDirectionsRouteKm(origin, waypoints, destination) {
  if (!GOOGLE_MAPS_API_KEY) return null;

  try {
    const wpParam = (waypoints && waypoints.length > 0)
      ? `&waypoints=${waypoints.map(w => `${w.lat},${w.lng}`).join('|')}`
      : '';

    const url =
      `https://maps.googleapis.com/maps/api/directions/json` +
      `?origin=${origin.lat},${origin.lng}` +
      `&destination=${destination.lat},${destination.lng}` +
      wpParam +
      `&mode=driving` +
      `&key=${GOOGLE_MAPS_API_KEY}`;

    const body = await fetchJson(url);

    if (body.status !== 'OK' || !body.routes?.[0]) return null;

    const totalMeters = (body.routes[0].legs || [])
      .reduce((sum, leg) => sum + (leg.distance?.value || 0), 0);
    if (totalMeters <= 0) return null;

    return parseFloat((totalMeters / 1000).toFixed(2));
  } catch {
    return null;
  }
}

module.exports = { getRoadDistance, optimizeWaypoints, optimizeRoute, getDirectionsRouteKm };
