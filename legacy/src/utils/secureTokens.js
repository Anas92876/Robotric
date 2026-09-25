/**
 * Secure Token Manager for One-Time-Use, IP-Locked URLs
 *
 * Provides single-use tokens for accessing sensitive resources like PDFs
 */

const crypto = require('crypto');

// In-memory storage (for production, use Redis)
const tokenStore = new Map();

// Cleanup expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of tokenStore.entries()) {
    if (data.expiresAt < now) {
      tokenStore.delete(token);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate a secure one-time token
 * @param {string} userId - User ID accessing the resource
 * @param {string} resourceId - Resource being accessed
 * @param {string} ipAddress - User's IP address
 * @param {number} expiresInSeconds - Expiration time in seconds (default: 60)
 * @returns {string} Secure token
 */
function generateSecureToken(userId, resourceId, ipAddress, expiresInSeconds = 60) {
  // Generate cryptographically secure random token
  const token = crypto.randomBytes(32).toString('hex');

  // Store token with metadata
  tokenStore.set(token, {
    userId: userId.toString(),
    resourceId: resourceId.toString(),
    ipAddress,
    used: false,
    createdAt: Date.now(),
    expiresAt: Date.now() + (expiresInSeconds * 1000)
  });

  return token;
}

/**
 * Validate and consume a token (one-time use)
 * @param {string} token - Token to validate
 * @param {string} userId - User ID making the request
 * @param {string} resourceId - Resource being accessed
 * @param {string} ipAddress - Request IP address
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateAndConsumeToken(token, userId, resourceId, ipAddress) {
  const tokenData = tokenStore.get(token);

  // Check if token exists
  if (!tokenData) {
    return { valid: false, error: 'Invalid or expired token' };
  }

  // Check if token already used
  if (tokenData.used) {
    tokenStore.delete(token);
    return { valid: false, error: 'Token already used' };
  }

  // Check expiration
  if (Date.now() > tokenData.expiresAt) {
    tokenStore.delete(token);
    return { valid: false, error: 'Token expired' };
  }

  // Validate user ID
  if (tokenData.userId !== userId.toString()) {
    return { valid: false, error: 'Token user mismatch' };
  }

  // Validate resource ID
  if (tokenData.resourceId !== resourceId.toString()) {
    return { valid: false, error: 'Token resource mismatch' };
  }

  // Validate IP address
  if (tokenData.ipAddress !== ipAddress) {
    return { valid: false, error: 'Token IP address mismatch' };
  }

  // Mark token as used and delete it
  tokenData.used = true;
  tokenStore.delete(token);

  return { valid: true };
}

/**
 * Get client IP address from request
 * @param {Object} req - Express request object
 * @returns {string} Client IP address
 */
function getClientIp(req) {
  // Check for forwarded IP (from proxy/load balancer)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }

  // Check for real IP header
  if (req.headers['x-real-ip']) {
    return req.headers['x-real-ip'];
  }

  // Fallback to connection remote address
  return req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
}

/**
 * Get token store statistics (for monitoring)
 * @returns {Object} Stats
 */
function getStats() {
  let active = 0;
  let used = 0;
  const now = Date.now();

  for (const data of tokenStore.values()) {
    if (data.expiresAt > now) {
      if (data.used) {
        used++;
      } else {
        active++;
      }
    }
  }

  return {
    total: tokenStore.size,
    active,
    used,
    expired: tokenStore.size - active - used
  };
}

module.exports = {
  generateSecureToken,
  validateAndConsumeToken,
  getClientIp,
  getStats
};
