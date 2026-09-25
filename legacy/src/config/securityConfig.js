const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

/**
 * Helmet Configuration
 * Sets various HTTP headers for security
 */
const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'", process.env.CLIENT_ORIGIN || 'http://localhost:5173'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },

  // HTTP Strict Transport Security (HSTS)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },

  // Disable X-Powered-By header
  hidePoweredBy: true,

  // Prevent clickjacking
  frameguard: {
    action: 'deny'
  },

  // Prevent MIME sniffing
  noSniff: true,

  // XSS Filter
  xssFilter: true,

  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },

  // Permissions Policy (formerly Feature Policy)
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none'
  }
});

/**
 * MongoDB Sanitization Configuration
 * Prevents NoSQL injection attacks
 */
const mongoSanitizeConfig = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`[Security] Sanitized request parameter: ${key}`, {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
  }
});

/**
 * Apply all security middleware
 */
function applySecurityMiddleware(app) {
  // Helmet security headers
  app.use(helmetConfig);

  // MongoDB injection protection
  app.use(mongoSanitizeConfig);

  // Trust proxy (for rate limiting behind reverse proxy)
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  console.log('✓ Security middleware applied');
}

module.exports = {
  helmetConfig,
  mongoSanitizeConfig,
  applySecurityMiddleware
};
