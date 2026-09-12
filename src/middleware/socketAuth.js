/**
 * Socket.IO Authentication Middleware
 *
 * Authenticates WebSocket connections using JWT tokens
 * Prevents unauthorized access to real-time features
 *
 * Best Practices:
 * - Verify JWT token before allowing connection
 * - Attach user information to socket instance
 * - Support for different authentication methods
 * - Clear error messages
 */

const { verifyJwt } = require('../utils/jwt');
const logger = require('../utils/logger');

/**
 * Socket.IO Authentication Middleware
 *
 * Usage:
 *   io.use(socketAuthMiddleware);
 *
 * Client must send token in one of these ways:
 * 1. In auth object: socket.auth = { token: 'jwt_token' }
 * 2. In query string: ?token=jwt_token
 * 3. In cookie (if available)
 *
 * @param {Socket} socket - Socket.IO socket instance
 * @param {Function} next - Callback function
 */
function socketAuthMiddleware(socket, next) {
  console.log('\n🔐 [SOCKET AUTH] New connection attempt');
  console.log('📍 Socket ID:', socket.id);
  console.log('🌐 Origin:', socket.handshake.headers.origin);
  console.log('🔗 Transport:', socket.handshake.transport);
  
  try {
    // Extract token from various sources
    console.log('🔍 [SOCKET AUTH] Extracting token...');
    const token = extractToken(socket);

    if (!token) {
      console.error('❌ [SOCKET AUTH] No token found!');
      console.log('📋 Handshake details:');
      console.log('   - auth:', socket.handshake.auth);
      console.log('   - headers.authorization:', socket.handshake.headers.authorization ? 'Present' : 'Missing');
      console.log('   - query.token:', socket.handshake.query?.token ? 'Present' : 'Missing');
      console.log('   - cookies:', socket.handshake.headers.cookie ? 'Present' : 'Missing');
      
      const error = new Error('Authentication required');
      error.data = {
        message: 'No authentication token provided',
        code: 'NO_TOKEN'
      };
      return next(error);
    }

    console.log('✅ [SOCKET AUTH] Token found');

    // Verify JWT token
    let decoded;
    try {
      console.log('🔐 [SOCKET AUTH] Verifying JWT token...');
      decoded = verifyJwt(token);
      
      if (!decoded) {
        console.error('❌ [SOCKET AUTH] Token verification returned null/undefined');
        const error = new Error('Authentication failed');
        error.data = {
          message: 'Invalid authentication token',
          code: 'INVALID_TOKEN'
        };
        return next(error);
      }
      
      console.log('✅ [SOCKET AUTH] Token verified successfully');
      console.log('👤 User ID:', decoded.userId || decoded.id);
      console.log('👤 User Email:', decoded.email);
      console.log('👤 User Role:', decoded.role);
      
    } catch (jwtError) {
      console.error('❌ [SOCKET AUTH] JWT verification failed:', jwtError.message);
      console.error('📋 Error details:', {
        name: jwtError.name,
        message: jwtError.message,
        stack: jwtError.stack
      });
      
      const error = new Error('Authentication failed');
      error.data = {
        message: jwtError.message === 'jwt expired'
          ? 'Token has expired. Please log in again.'
          : 'Invalid authentication token',
        code: jwtError.message === 'jwt expired' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
      };
      return next(error);
    }

    // Attach user information to socket
    socket.userId = decoded.userId || decoded.id;
    socket.userRole = decoded.role;
    socket.userEmail = decoded.email;

    // Log successful authentication (for monitoring)
    console.log('✅ [SOCKET AUTH] Authentication successful!');
    console.log('👤 Authenticated user:', decoded.email, `(${socket.userId})`);
    logger.info(`Socket.IO user authenticated: ${decoded.email} (${socket.id})`);

    // Continue with connection
    next();

  } catch (error) {
    console.error('❌ [SOCKET AUTH] Unexpected error during authentication:');
    console.error('📋 Error:', error);
    console.error('📋 Stack:', error.stack);
    logger.logError(error, { context: 'Socket.IO authentication' });
    const authError = new Error('Authentication error');
    authError.data = {
      message: 'An error occurred during authentication',
      code: 'AUTH_ERROR'
    };
    next(authError);
  }
}

/**
 * Extract JWT token from socket handshake
 *
 * Checks multiple sources in order of preference:
 * 1. auth.token (recommended)
 * 2. headers.authorization
 * 3. query.token
 * 4. cookies (if cookie-parser is used)
 *
 * @param {Socket} socket - Socket.IO socket instance
 * @returns {string|null} - JWT token or null
 */
function extractToken(socket) {
  console.log('🔍 [TOKEN EXTRACTION] Checking token sources...');
  console.log('📋 [TOKEN EXTRACTION] Full handshake data:', {
    auth: socket.handshake.auth,
    headers: {
      authorization: socket.handshake.headers.authorization ? 'Present' : 'Missing',
      cookie: socket.handshake.headers.cookie ? 'Present' : 'Missing'
    },
    query: socket.handshake.query
  });
  
  // Method 1: From auth object (recommended)
  if (socket.handshake.auth && socket.handshake.auth.token) {
    const token = socket.handshake.auth.token;
    console.log('✅ [TOKEN EXTRACTION] Token found in auth object');
    return token;
  } else {
    console.log('❌ [TOKEN EXTRACTION] No token in auth object');
    console.log('   auth object:', socket.handshake.auth);
  }

  // Method 2: From Authorization header
  const authHeader = socket.handshake.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    console.log('✅ [TOKEN EXTRACTION] Token found in Authorization header');
    return token;
  } else {
    console.log('❌ [TOKEN EXTRACTION] No token in Authorization header');
    console.log('   Authorization header:', authHeader || 'Missing');
  }

  // Method 3: From query string
  if (socket.handshake.query && socket.handshake.query.token) {
    const token = socket.handshake.query.token;
    console.log('✅ [TOKEN EXTRACTION] Token found in query string');
    return token;
  } else {
    console.log('❌ [TOKEN EXTRACTION] No token in query string');
    console.log('   Query:', socket.handshake.query);
  }

  // Method 4: From cookies
  if (socket.handshake.headers.cookie) {
    console.log('🍪 [TOKEN EXTRACTION] Cookies present, parsing...');
    const cookies = parseCookies(socket.handshake.headers.cookie);
    console.log('   Parsed cookies:', Object.keys(cookies));
    if (cookies.token || cookies.authToken) {
      const token = cookies.token || cookies.authToken;
      console.log('✅ [TOKEN EXTRACTION] Token found in cookies');
      return token;
    } else {
      console.log('❌ [TOKEN EXTRACTION] No token in cookies');
      console.log('   Available cookies:', Object.keys(cookies));
    }
  } else {
    console.log('❌ [TOKEN EXTRACTION] No cookies present');
  }

  console.log('❌ [TOKEN EXTRACTION] No token found in any source');
  return null;
}

/**
 * Simple cookie parser
 * @param {string} cookieString - Cookie header string
 * @returns {Object} - Parsed cookies
 */
function parseCookies(cookieString) {
  return cookieString.split(';').reduce((cookies, cookie) => {
    const [name, value] = cookie.trim().split('=');
    cookies[name] = decodeURIComponent(value);
    return cookies;
  }, {});
}

/**
 * Middleware to check if user has specific role
 *
 * Usage (in Socket.IO event handler):
 *   socket.on('admin:action', requireRole('admin'), (data) => { ... });
 *
 * @param {string|Array<string>} allowedRoles - Role(s) required
 * @returns {Function} - Middleware function
 */
function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (socket, data, next) => {
    if (!socket.userRole || !roles.includes(socket.userRole)) {
      const error = new Error('Forbidden');
      error.data = {
        message: 'You do not have permission to perform this action',
        code: 'FORBIDDEN',
        requiredRole: allowedRoles
      };
      return next(error);
    }
    next();
  };
}

/**
 * Rate limiter for Socket.IO events
 * Prevents spam and abuse
 *
 * @param {number} maxEvents - Maximum events per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} - Middleware function
 */
function socketRateLimit(maxEvents = 10, windowMs = 60000) {
  const clients = new Map();

  // Cleanup function to remove socket data on disconnect
  const cleanup = (socketId) => {
    clients.delete(socketId);
  };

  // Return middleware function with cleanup attached
  const middleware = (socket, data, next) => {
    const now = Date.now();
    const clientData = clients.get(socket.id) || { count: 0, resetTime: now + windowMs };

    // Reset if window has passed
    if (now > clientData.resetTime) {
      clientData.count = 0;
      clientData.resetTime = now + windowMs;
    }

    // Increment count
    clientData.count++;
    clients.set(socket.id, clientData);

    // Set up cleanup on disconnect if not already set
    if (!socket._rateLimitCleanupSet) {
      socket.on('disconnect', () => {
        cleanup(socket.id);
      });
      socket._rateLimitCleanupSet = true;
    }

    // Check limit
    if (clientData.count > maxEvents) {
      const error = new Error('Rate limit exceeded');
      error.data = {
        message: 'Too many events. Please slow down.',
        code: 'RATE_LIMIT',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000) + ' seconds'
      };
      return next(error);
    }

    next();
  };

  // Attach cleanup function for manual cleanup if needed
  middleware.cleanup = cleanup;

  return middleware;
}

module.exports = {
  socketAuthMiddleware,
  requireRole,
  socketRateLimit,
  extractToken
};
