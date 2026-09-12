const rateLimit = require('express-rate-limit');

// Upload rate limiter - Disabled in development, enabled in production
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 30 : 1000, // 30 in production, very high limit in development
  message: {
    success: false,
    error: {
      message: 'Too many uploads, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development', // Skip rate limiting entirely in development
});

// Viewer rate limiter - Disabled in development, enabled in production
const viewerLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 30 : 1000, // 30 in production, very high limit in development
  message: {
    success: false,
    error: {
      message: 'Too many requests, please slow down',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development', // Skip rate limiting entirely in development
});

module.exports = {
  uploadLimiter,
  viewerLimiter
};
