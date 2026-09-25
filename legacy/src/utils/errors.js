/**
 * Custom Error Classes
 *
 * Provides specialized error types for different scenarios:
 * - Better error categorization
 * - Consistent HTTP status codes
 * - Easier error handling
 * - Production-safe error messages
 *
 * Best Practices:
 * - Use specific error types for specific situations
 * - Include helpful error codes
 * - Provide user-friendly messages
 * - Log detailed information separately
 */

/**
 * Base Application Error
 * All custom errors extend from this
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // Marks as expected error vs programming error
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Bad Request Error (400)
 * For invalid request data
 */
class BadRequestError extends AppError {
  constructor(message = 'Bad request', code = 'BAD_REQUEST') {
    super(message, 400, code);
  }
}

/**
 * Validation Error (400)
 * For validation failures
 */
class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

/**
 * Unauthorized Error (401)
 * For authentication failures
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

/**
 * Forbidden Error (403)
 * For authorization failures
 */
class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

/**
 * Not Found Error (404)
 * For missing resources
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource', code = 'NOT_FOUND') {
    super(`${resource} not found`, 404, code);
    this.resource = resource;
  }
}

/**
 * Conflict Error (409)
 * For resource conflicts (e.g., duplicate email)
 */
class ConflictError extends AppError {
  constructor(message = 'Resource conflict', code = 'CONFLICT') {
    super(message, 409, code);
  }
}

/**
 * Too Many Requests Error (429)
 * For rate limiting
 */
class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests', retryAfter = 60) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.retryAfter = retryAfter;
  }
}

/**
 * Internal Server Error (500)
 * For unexpected server errors
 */
class InternalError extends AppError {
  constructor(message = 'Internal server error', code = 'INTERNAL_ERROR') {
    super(message, 500, code);
  }
}

/**
 * Service Unavailable Error (503)
 * For temporary service failures
 */
class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable', code = 'SERVICE_UNAVAILABLE') {
    super(message, 503, code);
  }
}

/**
 * Database Error
 * For database operation failures
 */
class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', originalError = null) {
    super(message, 500, 'DATABASE_ERROR');
    this.originalError = originalError;
  }
}

/**
 * Format error response for client
 * Ensures consistent error format and hides sensitive info in production
 *
 * @param {Error} error - Error object
 * @param {boolean} includeStack - Whether to include stack trace
 * @returns {Object} - Formatted error response
 */
function formatErrorResponse(error, includeStack = false) {
  const response = {
    success: false,
    error: {
      message: error.message || 'An error occurred',
      code: error.code || 'UNKNOWN_ERROR',
      statusCode: error.statusCode || 500
    }
  };

  // Add additional fields for specific error types
  if (error instanceof ValidationError && error.errors) {
    response.error.errors = error.errors;
  }

  if (error instanceof NotFoundError && error.resource) {
    response.error.resource = error.resource;
  }

  if (error instanceof TooManyRequestsError && error.retryAfter) {
    response.error.retryAfter = error.retryAfter;
  }

  // Include stack trace only in development
  if (includeStack && error.stack) {
    response.error.stack = error.stack;
  }

  return response;
}

/**
 * Check if error is operational (expected) or programming error
 *
 * @param {Error} error - Error to check
 * @returns {boolean} - True if operational error
 */
function isOperationalError(error) {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Handle MongoDB duplicate key error
 * Converts to more user-friendly message
 *
 * @param {Error} error - MongoDB error
 * @returns {ConflictError} - Formatted conflict error
 */
function handleMongoError(error) {
  // Duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    return new ConflictError(`${field} already exists`);
  }

  // Validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors || {}).map(err => ({
      field: err.path,
      message: err.message
    }));
    return new ValidationError('Validation failed', errors);
  }

  // Cast error (invalid ID format)
  if (error.name === 'CastError') {
    return new BadRequestError(`Invalid ${error.path}: ${error.value}`);
  }

  // Default database error
  return new DatabaseError(error.message, error);
}

module.exports = {
  AppError,
  BadRequestError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
  InternalError,
  ServiceUnavailableError,
  DatabaseError,
  formatErrorResponse,
  isOperationalError,
  handleMongoError
};
