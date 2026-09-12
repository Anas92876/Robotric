const { verifyJwt } = require("../utils/jwt");

function requireAuth(req, res, next) {
  // Check for token in multiple places:
  // 1. Cookie (for web browsers)
  // 2. Authorization header (for mobile apps)
  let token = req.cookies?.token;

  // If no cookie, check Authorization header
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }
  }

  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: {
        message: "Unauthorized",
        code: "UNAUTHORIZED",
        statusCode: 401
      }
    });
  }

  const decoded = verifyJwt(token);
  if (!decoded) {
    return res.status(401).json({ 
      success: false,
      error: {
        message: "Invalid or expired token",
        code: "INVALID_TOKEN",
        statusCode: 401
      }
    });
  }

  // Ensure both `id`, `_id`, and `userId` are available for compatibility
  req.user = {
    ...decoded,
    _id: decoded.id || decoded._id,
    userId: decoded.id || decoded._id
  };
  next();
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: {
          message: "Unauthorized",
          code: "UNAUTHORIZED",
          statusCode: 401
        }
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        error: {
          message: "Forbidden - Insufficient permissions",
          code: "FORBIDDEN",
          statusCode: 403
        }
      });
    }
    next();
  };
}

// Reception role middleware
function requireReception(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      error: {
        message: "Unauthorized",
        code: "UNAUTHORIZED",
        statusCode: 401
      }
    });
  }
  const allowedRoles = ['reception', 'admin', 'superadmin'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ 
      success: false,
      error: {
        message: "Access denied. Reception privileges required.",
        code: "FORBIDDEN",
        statusCode: 403
      }
    });
  }
  next();
}

// Trainer role middleware
function requireTrainer(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      error: {
        message: "Unauthorized",
        code: "UNAUTHORIZED",
        statusCode: 401
      }
    });
  }
  const allowedRoles = ['trainer', 'admin', 'superadmin'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ 
      success: false,
      error: {
        message: "Access denied. Trainer privileges required.",
        code: "FORBIDDEN",
        statusCode: 403
      }
    });
  }
  next();
}

// Driver role middleware
function requireDriver(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { message: "Unauthorized", code: "UNAUTHORIZED", statusCode: 401 }
    });
  }
  const allowedRoles = ['driver', 'admin', 'superadmin'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: { message: "Access denied. Driver privileges required.", code: "FORBIDDEN", statusCode: 403 }
    });
  }
  next();
}

// CLO role middleware
function requireCLO(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      error: {
        message: "Unauthorized",
        code: "UNAUTHORIZED",
        statusCode: 401
      }
    });
  }
  const allowedRoles = ['clo', 'admin', 'superadmin'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ 
      success: false,
      error: {
        message: "Access denied. CLO privileges required.",
        code: "FORBIDDEN",
        statusCode: 403
      }
    });
  }
  next();
}

module.exports = {
  // New naming convention
  protect: requireAuth,
  restrictTo: (...roles) => requireRoles(...roles),
  // Legacy naming convention (for backward compatibility)
  requireAuth,
  requireRoles,
  // Role-specific middleware
  requireReception,
  requireTrainer,
  requireCLO,
  requireDriver,
};
