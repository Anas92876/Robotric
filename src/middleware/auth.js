const { verifyJwt } = require("../utils/jwt");
const User = require("../models/User");

async function requireAuth(req, res, next) {
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

  // Token signature is valid, but a valid signature is not the same as a valid
  // session. Without this check a token stays usable for its full 7-day life
  // even after the password is changed or the account is disabled, and there is
  // no way to log anyone out server-side.
  //
  // Tokens issued before tokenVersion existed carry no such claim; they are
  // treated as version 0 so live sessions are not invalidated by this change.
  const userId = decoded.id || decoded._id;
  try {
    const current = await User.findById(userId).select("tokenVersion").lean();

    if (!current) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Account no longer exists",
          code: "ACCOUNT_NOT_FOUND",
          statusCode: 401
        }
      });
    }

    if ((decoded.tokenVersion ?? 0) !== (current.tokenVersion ?? 0)) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Session has been revoked. Please sign in again.",
          code: "TOKEN_REVOKED",
          statusCode: 401
        }
      });
    }
  } catch (err) {
    return next(err);
  }

  // Ensure both `id`, `_id`, and `userId` are available for compatibility
  req.user = {
    ...decoded,
    _id: userId,
    userId: userId
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
