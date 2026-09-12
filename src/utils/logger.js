/**
 * Winston Logger Configuration
 *
 * Production-ready logging system with:
 * - Multiple log levels (error, warn, info, debug)
 * - File rotation for log management
 * - Separate error and combined logs
 * - Console output in development
 * - JSON formatting for log aggregation
 * - Timestamp and metadata support
 *
 * Best Practices:
 * - Structured logging with context
 * - Environment-aware configuration
 * - Scalable for production monitoring
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Custom log format with colors for console
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = '\n' + JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

/**
 * JSON format for file logs (easier to parse)
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Transport for error logs
 * Rotates daily, keeps 14 days of logs
 */
const errorFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  format: fileFormat,
  maxFiles: '14d', // Keep 14 days
  maxSize: '20m', // Max 20MB per file
  zippedArchive: true
});

/**
 * Transport for combined logs (all levels)
 * Rotates daily, keeps 14 days of logs
 */
const combinedFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  format: fileFormat,
  maxFiles: '14d',
  maxSize: '20m',
  zippedArchive: true
});

/**
 * Console transport for development
 * Only used in development mode
 */
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
  level: process.env.LOG_LEVEL || 'debug'
});

/**
 * Create Winston logger instance
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: fileFormat,
  defaultMeta: {
    service: 'robotric-api',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    errorFileTransport,
    combinedFileTransport
  ],
  // Don't exit on uncaught errors
  exitOnError: false
});

/**
 * Add console transport in development
 * or if explicitly enabled
 */
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_CONSOLE_LOGS === 'true') {
  logger.add(consoleTransport);
}

/**
 * Stream for Morgan HTTP logger
 * Routes HTTP logs through Winston
 */
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

/**
 * Helper methods for common logging patterns
 */

/**
 * Log HTTP request
 * @param {Object} req - Express request object
 * @param {string} message - Log message
 */
logger.logRequest = (req, message = 'HTTP Request') => {
  logger.info(message, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
};

/**
 * Log database operation
 * @param {string} operation - Operation name
 * @param {string} collection - Collection/model name
 * @param {Object} metadata - Additional data
 */
logger.logDB = (operation, collection, metadata = {}) => {
  logger.debug(`DB: ${operation} on ${collection}`, metadata);
};

/**
 * Log security event
 * @param {string} event - Security event name
 * @param {Object} details - Event details
 */
logger.logSecurity = (event, details = {}) => {
  logger.warn(`Security: ${event}`, {
    ...details,
    timestamp: new Date().toISOString()
  });
};

/**
 * Log authentication event
 * @param {string} event - Auth event (login, logout, etc.)
 * @param {Object} user - User information
 */
logger.logAuth = (event, user = {}) => {
  logger.info(`Auth: ${event}`, {
    userId: user.id || user._id,
    email: user.email,
    role: user.role
  });
};

/**
 * Log error with full context
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
logger.logError = (error, context = {}) => {
  logger.error(error.message, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    },
    ...context
  });
};

/**
 * Log performance metric
 * @param {string} operation - Operation name
 * @param {number} duration - Duration in ms
 * @param {Object} metadata - Additional data
 */
logger.logPerformance = (operation, duration, metadata = {}) => {
  const level = duration > 1000 ? 'warn' : 'debug';
  logger[level](`Performance: ${operation} took ${duration}ms`, metadata);
};

module.exports = logger;
