/**
 * Async Handler Wrapper
 *
 * Eliminates need for try-catch blocks in controllers
 * Automatically forwards errors to Express error handler
 *
 * Usage:
 *   const listParts = asyncHandler(async (req, res) => {
 *     const parts = await Part.find();
 *     res.json(parts);
 *   });
 *
 * Best Practices:
 * - Use for all async route handlers
 * - Throw custom errors from utils/errors.js
 * - Let middleware handle error responses
 * - No need for try-catch in controllers
 */

const logger = require('./logger');
const { handleMongoError } = require('./errors');

/**
 * Wraps async route handlers to catch errors
 *
 * @param {Function} fn - Async route handler function
 * @returns {Function} - Express middleware function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next))
      .catch((error) => {
        // Convert MongoDB errors to user-friendly errors
        if (error.name === 'MongoError' || error.name === 'MongoServerError' ||
            error.name === 'ValidationError' || error.name === 'CastError' ||
            error.code === 11000) {
          error = handleMongoError(error);
        }

        // Log the error for debugging with comprehensive context
        logger.logError(error, {
          path: req.path,
          method: req.method,
          ip: req.ip,
          user: req.user ? { 
            id: req.user.id || req.user._id, 
            role: req.user.role,
            email: req.user.email 
          } : null,
          query: Object.keys(req.query).length > 0 ? req.query : undefined,
          body: req.method !== 'GET' && req.body ? 
            (typeof req.body === 'object' ? 
              // Remove sensitive fields from body logging
              Object.fromEntries(
                Object.entries(req.body).filter(([key]) => 
                  !['password', 'token', 'secret', 'apiKey'].includes(key.toLowerCase())
                )
              ) : req.body
            ) : undefined,
          params: Object.keys(req.params).length > 0 ? req.params : undefined
        });

        // Forward to error handler middleware
        next(error);
      });
  };
};

module.exports = asyncHandler;
