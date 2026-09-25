/**
 * Timeout Utility
 * 
 * Provides timeout protection for async operations
 * Useful for database queries, external API calls, and long-running operations
 */

const { AppError } = require('./errors');
const logger = require('./logger');

/**
 * Wraps an async operation with a timeout
 * 
 * @param {Promise} promise - The promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} operationName - Name of the operation (for error messages)
 * @returns {Promise} - Promise that rejects if timeout is exceeded
 */
function withTimeout(promise, timeoutMs, operationName = 'Operation') {
  let timeoutId;
  
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(`${operationName} timed out after ${timeoutMs}ms`);
      error.code = 'TIMEOUT';
      error.timeout = timeoutMs;
      logger.logError(error, {
        context: 'operation_timeout',
        operationName,
        timeoutMs
      });
      reject(new AppError(`${operationName} timed out. Please try again.`, 504));
    }, timeoutMs);
  });
  
  return Promise.race([
    promise.then((result) => {
      clearTimeout(timeoutId);
      return result;
    }).catch((error) => {
      clearTimeout(timeoutId);
      throw error;
    }),
    timeoutPromise
  ]);
}

/**
 * Wraps a function with timeout protection
 * 
 * @param {Function} fn - Async function to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} operationName - Name of the operation (for error messages)
 * @returns {Function} - Wrapped function
 */
function timeoutWrapper(fn, timeoutMs, operationName) {
  return async (...args) => {
    return withTimeout(fn(...args), timeoutMs, operationName);
  };
}

/**
 * Default timeouts for different operation types (in milliseconds)
 */
const TIMEOUTS = {
  DATABASE_QUERY: 30000,      // 30 seconds for database queries
  DATABASE_AGGREGATION: 60000, // 60 seconds for complex aggregations
  EXTERNAL_API: 15000,         // 15 seconds for external API calls
  FILE_UPLOAD: 60000,          // 60 seconds for file uploads
  FILE_PROCESSING: 30000,      // 30 seconds for file processing
  DEFAULT: 30000               // 30 seconds default
};

module.exports = {
  withTimeout,
  timeoutWrapper,
  TIMEOUTS
};
