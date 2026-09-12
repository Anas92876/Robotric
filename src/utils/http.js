// Small HTTP/controller helpers used across the transport feature.
//
// These exist to delete the same try/catch and find-or-404 boilerplate that
// was duplicated in every handler. They don't change the response shape, so
// existing API consumers keep working.

/**
 * Wrap an async Express handler so any thrown error becomes a 500 response
 * with the same `{ success: false, error: { message } }` shape every other
 * endpoint returns. Lets handlers stay focused on the happy path.
 *
 *   exports.foo = asyncRoute(async (req, res) => { ... });
 */
function asyncRoute(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (err) {
      console.error(`[${req.method} ${req.originalUrl}]`, err.message);
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  };
}

/**
 * Standardised error response. Use when you want to bail out early with a
 * specific status code.
 */
function fail(res, status, message, extra = {}) {
  return res.status(status).json({ success: false, error: { message, ...extra } });
}

/**
 * Standardised success response.
 */
function ok(res, data) {
  return res.json({ success: true, data });
}

/**
 * Find a TransportTrip by id, ensure the caller owns it, and (optionally)
 * verify a state transition is allowed. Returns the trip on success, or null
 * after sending the appropriate error response — callers should `return` if
 * they get null.
 *
 *   const trip = await findOwnedTrip(req, res, { transitionTo: 'in_travel' });
 *   if (!trip) return;
 */
async function findOwnedTrip(req, res, { transitionTo = null } = {}) {
  const TransportTrip = require('../models/TransportTrip');

  const trip = await TransportTrip.findById(req.params.id);
  if (!trip) { fail(res, 404, 'Trip not found'); return null; }

  if (String(trip.driverId) !== String(req.user._id)) {
    fail(res, 403, 'Not your trip');
    return null;
  }

  if (transitionTo && !TransportTrip.isValidTransition(trip.status, transitionTo)) {
    fail(res, 400, `Cannot ${transitionTo === 'in_travel' ? 'start' : transitionTo === 'completed' ? 'complete' : transitionTo === 'cancelled' ? 'cancel' : 'transition'} a ${trip.status} trip`);
    return null;
  }

  return trip;
}

module.exports = { asyncRoute, fail, ok, findOwnedTrip };
