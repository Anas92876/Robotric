// Must be set before any Date usage so new Date() uses Damascus local time (+3)
process.env.TZ = 'Asia/Damascus';

const express = require("express");
const http = require("http");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const multer = require("multer");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

dotenv.config();

// Process-level error handlers (MUST be set up FIRST, before any other code)
// Use simple console.error to avoid any dependency issues
process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', err);
  console.error('Stack:', err.stack);
  console.error('Uncaught Exception - Shutting down gracefully');
  
  // Give time for logs to be written
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason) => {
  console.error('🔥 Unhandled Rejection:', reason);
  if (reason instanceof Error) {
    console.error('Stack:', reason.stack);
  }
  // In production, log but don't exit (let server handle it)
  if (process.env.NODE_ENV === 'production') {
    console.error('Unhandled Rejection - Server will continue but this should be fixed');
  }
});

// Initialize logger (after error handlers are set up)
let logger = null;
try {
  logger = require('./src/utils/logger');
} catch (error) {
  console.error('Failed to initialize logger:', error.message);
  // Create a minimal logger fallback
  logger = {
    logError: (err, ctx) => console.error('Error:', err.message, ctx),
    info: (msg, meta) => console.log('Info:', msg, meta),
    warn: (msg, meta) => console.warn('Warn:', msg, meta),
    error: (msg, meta) => console.error('Error:', msg, meta)
  };
}

// Validate environment variables (with error handling)
let validateEnv;
try {
  validateEnv = require('./src/config/validateEnv').validateEnv;
  validateEnv();
} catch (error) {
  console.error('🔥 Environment validation failed:', error.message);
  if (error.stack) {
    console.error('Stack trace:', error.stack.split('\n').slice(0, 5).join('\n'));
  }
  console.error('📍 Server startup may fail. Please fix environment configuration issues.');
  // Don't exit here - let the server attempt to start and fail naturally if needed
}

// Rate limiting middleware
const { apiLimiter } = require('./src/middleware/rateLimiting');

// Auth guards (used by the gated diagnostics endpoint below)
const { requireAuth, requireRoles } = require('./src/middleware/auth');

const app = express();

// Apply security middleware (Helmet headers, NoSQL injection protection)
const { applySecurityMiddleware } = require('./src/config/securityConfig');
applySecurityMiddleware(app);

// Trust proxy for production (needed for rate limiting behind Vercel/Railway)
// Note: This is also set in applySecurityMiddleware, but keeping here for clarity
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

const server = http.createServer(app);
// Socket.IO CORS configuration - Include production origins
const socketOrigins = [
  process.env.CLIENT_ORIGIN || "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://localhost:8081",
  "http://localhost:19000",
  "http://localhost:19001",
  "http://localhost:19006",
  // Production origins
  "https://robotrick-main.vercel.app",
  "https://robotrick-backend-production.up.railway.app",
  "https://www.robotrick.net"
];

// Add production origin if specified
if (process.env.CLIENT_ORIGIN && !socketOrigins.includes(process.env.CLIENT_ORIGIN)) {
  socketOrigins.push(process.env.CLIENT_ORIGIN);
}

// Socket.IO CORS - Use function for flexible origin checking
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) {
        console.log('🔓 [Socket.IO CORS] Allowing request with no origin');
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/$/, '');

      const productionDomains = [
        'robotrick-main.vercel.app',
        'robotrick-backend-production.up.railway.app',
        'www.robotrick.net'
      ];

      for (const domain of productionDomains) {
        if (normalizedOrigin.includes(domain)) {
          console.log('✅ [Socket.IO CORS] Allowing production origin:', normalizedOrigin);
          return callback(null, true);
        }
      }

      if (process.env.NODE_ENV !== 'production') {
        if (normalizedOrigin.includes('localhost') || normalizedOrigin.includes('127.0.0.1')) {
          console.log('✅ [Socket.IO CORS] Allowing localhost origin:', normalizedOrigin);
          return callback(null, true);
        }
      }

      if (socketOrigins.includes(origin) || socketOrigins.includes(normalizedOrigin)) {
        console.log('✅ [Socket.IO CORS] Allowing origin:', normalizedOrigin);
        return callback(null, true);
      }

      if (process.env.NODE_ENV === 'production') {
        console.warn('❌ [Socket.IO CORS] Rejecting origin:', normalizedOrigin);
        return callback(new Error('Not allowed by CORS'));
      }

      console.log('⚠️ [Socket.IO CORS] Allowing unknown origin in dev:', normalizedOrigin);
      return callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Authorization", "Content-Type"],
  },
});


// CORS configuration - Allow web and mobile app origins
const allowedOrigins = [
  process.env.CLIENT_ORIGIN || "http://localhost:5173",
  "http://localhost:5174", // Alternate web port
  "http://localhost:3000", // Vite dev server
  "http://localhost:8081", // Expo/React Native mobile app (localhost)
  "http://localhost:19000", // Expo DevTools
  "http://localhost:19001", // Expo Metro bundler
  "http://localhost:19006", // Expo web
  "http://192.168.1.133:8081", // Mobile app on network IP
  "exp://192.168.1.133:8081", // Expo scheme
  // Production origins
  "https://robotrick-main.vercel.app",
  "https://robotrick-main.vercel.app/",
  "https://robotric-main.onrender.com",
  "https://robotric-main.onrender.com/",
];

// Add production origin if specified and not already included
if (process.env.CLIENT_ORIGIN && !allowedOrigins.includes(process.env.CLIENT_ORIGIN)) {
  allowedOrigins.push(process.env.CLIENT_ORIGIN);
}

// Helper to check if origin is allowed (handles wildcard IPs for mobile testing)
const isOriginAllowed = (origin) => {
  if (!origin) return false;

  // Normalize origin (remove trailing slash)
  const normalizedOrigin = origin.replace(/\/$/, '');

  // Check exact matches
  if (allowedOrigins.includes(origin) || allowedOrigins.includes(normalizedOrigin)) return true;

  // Check production domains (with or without trailing slash)
  const productionDomains = [
    'robotrick-main.vercel.app',
    'robotric-main.onrender.com'
  ];
  
  for (const domain of productionDomains) {
    if (origin.includes(domain)) {
      return true;
    }
  }

  // Allow any localhost ports for development
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) return true;

  // Allow any local network IP on port 8081 (Expo default) or 4889 for mobile testing
  if (origin.match(/http:\/\/192\.168\.\d+\.\d+:(8081|19000|19001|19006)/)) return true;

  return false;
};

// CORS middleware - Enhanced for mobile support
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const platform = req.headers['x-platform']; // mobile or web
  const userAgent = req.headers['user-agent'] || '';

  // Allow requests with no origin (mobile apps, Postman, curl, etc.)
  // Mobile apps often don't send origin header
  if (!origin) {
    // Detect mobile apps by User-Agent or X-Platform header
    const isLikelyMobile = platform === 'mobile' || 
                          userAgent.includes('Mobile') || 
                          userAgent.includes('Android') || 
                          userAgent.includes('iOS') ||
                          userAgent.includes('ReactNative');
    
    if (isLikelyMobile || platform === 'mobile') {
      // For mobile apps, allow all origins (they don't send origin header)
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS"
      );
      res.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Platform, X-Requested-With, Accept"
      );
      // Don't set credentials for wildcard origin (CORS spec requirement)
      res.header("Access-Control-Expose-Headers", "Authorization");

      // Log platform for debugging
      if (process.env.NODE_ENV !== 'production') {
        console.log(`📱 Mobile request without origin: ${req.method} ${req.url}`);
      }
    } else {
      // For other requests without origin (Postman, curl, etc.), allow from CLIENT_ORIGIN
      const defaultOrigin = process.env.CLIENT_ORIGIN || "*";
      res.header("Access-Control-Allow-Origin", defaultOrigin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS"
      );
      res.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Platform, X-Requested-With, Accept"
      );
      if (defaultOrigin !== "*") {
        res.header("Access-Control-Allow-Credentials", "true");
      }
      res.header("Access-Control-Expose-Headers", "set-cookie, Authorization");
    }
  } else if (isOriginAllowed(origin)) {
    // Check if origin is allowed (uses helper function for flexible matching)
    res.header("Access-Control-Allow-Origin", origin);
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Platform, X-Requested-With, Accept"
    );
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Expose-Headers", "set-cookie, Authorization");

    // Log platform for debugging in development
    if (platform && process.env.NODE_ENV !== 'production') {
      console.log(`🌐 Web request from ${platform} platform: ${req.method} ${req.url}`);
    }
  } else {
    // Origin not allowed - log but still allow request (CORS is browser-only)
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`⚠️  CORS: Origin not in whitelist: ${origin}`);
    }
    // Still set CORS headers for preflight, but don't set Allow-Origin
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Platform, X-Requested-With, Accept"
    );
  }

  // Handle preflight requests (OPTIONS)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
});

// Middleware
// JSON parser with explicit size limit and error handling
app.use(express.json({ 
  limit: '10mb',
  strict: true // Only parse arrays and objects
}));

// JSON parsing error handler (must be after express.json())
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.logError(err, {
      context: 'json_parsing_error',
      path: req.path,
      method: req.method,
      body: req.body ? 'present' : 'missing'
    });
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid JSON format in request body',
        code: 'INVALID_JSON',
        statusCode: 400
      }
    });
  }
  next(err);
});

// Request body size limit error handler
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large' || err.status === 413) {
    logger.logError(err, {
      context: 'request_too_large',
      path: req.path,
      method: req.method,
      contentLength: req.headers['content-length']
    });
    return res.status(413).json({
      success: false,
      error: {
        message: 'Request body too large. Maximum size is 10MB',
        code: 'PAYLOAD_TOO_LARGE',
        statusCode: 413
      }
    });
  }
  next(err);
});

app.use(cookieParser());
app.use(morgan("dev"));

// Apply global rate limiter to all API routes
app.use("/api", apiLimiter);

// Liveness probe — MUST stay above the DB middleware.
// The platform restarts the container when this fails, so it must not depend
// on MongoDB; otherwise a brief database blip becomes a restart loop.
// Deliberately exposes nothing about the environment or its configuration.
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// DB Connection Middleware for Vercel (ensures connection before each request)
// Applied to all routes below this point
app.use(async (req, res, next) => {
  try {
    await connectDB(2, 1000); // 2 retries with 1s delay for Vercel (faster)
    next();
  } catch (error) {
    logger.logError(error, {
      context: 'database_middleware_error',
      path: req.path,
      method: req.method
    });
    
    res.status(503).json({
      success: false,
      error: {
        message: "Database connection failed. Please try again later.",
        code: "DATABASE_UNAVAILABLE",
        statusCode: 503
      }
    });
  }
});

// Root endpoint.
// Previously rendered a status page exposing NODE_ENV, whether MONGO_URI and
// JWT_SECRET were set, and the live database connection state to anyone who
// asked. That is infrastructure reconnaissance; it now says nothing.
app.get("/", (req, res) => {
  res.type("text/plain").send("Robotric API");
});

// Readiness / diagnostics — reports infrastructure state, so it is gated.
// The public liveness probe is /api/health, registered above the DB middleware.
app.get(
  "/api/health/deep",
  requireAuth,
  requireRoles("admin", "superadmin", "cto"),
  (req, res) => {
    res.json({
      status: "ok",
      mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      timestamp: new Date().toISOString()
    });
  }
);

// Routes
// Inject io into services that need to emit
try {
  require("./src/services/stock.service").setIo(io);
  require("./src/services/webNotification.service").setIo(io);
} catch (error) {
  console.error("❌ Error loading services:", error.message);
  console.error("Stack:", error.stack);
  throw error;
}

// Helper function to safely load routes
function loadRoute(path, routePath) {
  try {
    const route = require(routePath);
    app.use(path, route);
    console.log(`✅ Route loaded: ${path}`);
    return true;
  } catch (error) {
    console.error(`❌ Error loading route ${path}:`, error.message);
    console.error(`   File: ${routePath}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
    }
    throw error;
  }
}

// Core API routes
loadRoute("/api/auth", "./src/routes/auth.routes");
loadRoute("/api/parts", "./src/routes/parts.routes");
loadRoute("/api/stock", "./src/routes/stock.routes");
loadRoute("/api/orders", "./src/routes/orders.routes");
loadRoute("/api/projects", "./src/routes/projects.routes");
loadRoute("/api/competitions", "./src/routes/competitions.routes");
loadRoute("/api/teams", "./src/routes/teams.routes");
loadRoute("/api/posts", "./src/routes/posts.routes");
loadRoute("/api/images", "./src/routes/image.routes");
loadRoute("/api/users", "./src/routes/users.routes");
loadRoute("/api/contact", "./src/routes/contact.routes");
loadRoute("/api/jobs", "./src/routes/job.application.routes");
loadRoute("/api/notifications", "./src/routes/notifications.routes");
loadRoute("/api/web-notifications", "./src/routes/webNotifications.routes");

// Student routes
loadRoute("/api/student/courses", "./src/routes/student.courses.routes");
loadRoute("/api/student/sessions", "./src/routes/student.sessions.routes");
loadRoute("/api/student/resources", "./src/routes/student.resources.routes");
loadRoute("/api/student/modules", "./src/routes/student.modules.routes");
loadRoute("/api/student/quizzes", "./src/routes/student.quizzes.routes");
loadRoute("/api/student/assignments", "./src/routes/student.assignments.routes");
loadRoute("/api/student/attendance", "./src/routes/student.attendance.routes");
loadRoute("/api/student/payments", "./src/routes/student.payments.routes");
loadRoute("/api/student/dashboard", "./src/routes/student.dashboard.routes");
loadRoute("/api/subscriptions", "./src/routes/student.subscriptions.routes");
loadRoute("/api/student/tasks", "./src/routes/student.tasks.routes");
loadRoute("/api/student/projects", "./src/routes/student.projects.routes");
loadRoute("/api/student/gallery", "./src/routes/student.gallery.routes");
loadRoute("/api/student/certificates", "./src/routes/student.certificates.routes");
loadRoute("/api/student/documents", "./src/routes/student.documents.routes");

// Public certificate verification (no auth)
loadRoute("/api/certificates", "./src/routes/certificates.public.routes");

// Public website content (no auth)
loadRoute("/api/public", "./src/routes/public.routes");

// Trainer routes
loadRoute("/api/trainer/dashboard", "./src/routes/trainer.dashboard.routes");
loadRoute("/api/trainer/groups", "./src/routes/trainer.groups.routes");
loadRoute("/api/trainer/sessions", "./src/routes/trainer.sessions.routes");
loadRoute("/api/trainer/attendance", "./src/routes/trainer.attendance.routes");
loadRoute("/api/trainer/evaluations", "./src/routes/trainer.evaluations.routes");
loadRoute("/api/trainer/quizzes", "./src/routes/trainer.quizzes.routes");
loadRoute("/api/trainer/tasks", "./src/routes/trainer.tasks.routes");
loadRoute("/api/trainer/projects", "./src/routes/trainer.projects.routes");
loadRoute("/api/trainer/gallery", "./src/routes/trainer.gallery.routes");
loadRoute("/api/trainer/resources", "./src/routes/trainer.resources.routes");
loadRoute("/api/trainer/board", "./src/routes/trainer.board.routes");
loadRoute("/api/student/board", "./src/routes/student.board.routes");

// Reception routes - Manages student/trainer accounts, enrollments, schedules, and leads
loadRoute("/api/reception", "./src/routes/reception.routes");
loadRoute("/api/reception/settings", "./src/routes/reception.settings.routes");
loadRoute("/api/reception/gallery", "./src/routes/reception.gallery.routes");

// CLO routes - Chief Learning Officer manages trainers, courses, groups, and analytics
loadRoute("/api/clo", "./src/routes/clo.routes");
loadRoute("/api/clo/sessions", "./src/routes/clo.sessions.routes");
loadRoute("/api/clo/tasks", "./src/routes/clo.tasks.routes");
loadRoute("/api/clo/projects", "./src/routes/clo.projects.routes");
loadRoute("/api/clo/gallery", "./src/routes/clo.gallery.routes");
loadRoute("/api/clo/certificates", "./src/routes/clo.certificates.routes");
loadRoute("/api/clo/documents", "./src/routes/clo.documents.routes");

// CTO internal task management routes
loadRoute("/api/cto/internal", "./src/routes/cto.internal.routes");

// Engineer routes
loadRoute("/api/engineer", "./src/routes/engineer.routes");

// Client portal routes
loadRoute("/api/client", "./src/routes/client.routes");

// Transport routes
loadRoute("/api/management/transport", "./src/routes/management.transport.routes");
loadRoute("/api/reception/transport",  "./src/routes/reception.transport.routes");
loadRoute("/api/driver/transport",     "./src/routes/transport.driver.routes");
loadRoute("/api/student/transport",    "./src/routes/student.transport.routes");

// Chat routes - Real-time messaging
loadRoute("/api/chats", "./src/routes/chat.routes");

// App version / force-update routes
loadRoute("/api/app-version", "./src/routes/app.version.routes");
loadRoute("/api/admin/settings/version", "./src/routes/admin.version.routes");

app.use("/uploads", express.static("uploads"));

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ success: false, message: "File too large (max 5MB)" });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res
        .status(400)
        .json({ success: false, message: "Too many files (max 10)" });
    }
  }
  if (
    error.message &&
    (error.message.includes("Invalid file format") ||
      error.message.includes("Only image files"))
  ) {
    return res.status(400).json({ success: false, message: error.message });
  }
  next(error);
});

// 404 handler
app.use((req, res) => {
  logger.logError(new Error('Route not found'), {
    context: '404_not_found',
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  res.status(404).json({
    success: false,
    error: {
      message: "Route not found",
      code: "NOT_FOUND",
      statusCode: 404,
      path: req.path
    }
  });
});

// Error handler (logger already required at top)
const { formatErrorResponse, isOperationalError } = require('./src/utils/errors');

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Log error with comprehensive context
  logger.logError(err, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    user: req.user ? {
      id: req.user.id || req.user._id,
      role: req.user.role,
      email: req.user.email
    } : null,
    query: Object.keys(req.query || {}).length > 0 ? req.query : undefined,
    params: Object.keys(req.params || {}).length > 0 ? req.params : undefined,
    errorCategory: err.code || err.name || 'UNKNOWN',
    isOperational: err.isOperational !== undefined ? err.isOperational : true
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Format error response
  const isDev = process.env.NODE_ENV !== 'production';
  const response = formatErrorResponse(err, isDev);

  // Send response
  res.status(statusCode).json(response);
});

// Socket.IO authentication & events
console.log('\n🔌 [SERVER] Initializing Socket.IO...');
const { socketAuthMiddleware } = require('./src/middleware/socketAuth');

// Apply authentication middleware to all socket connections
console.log('🔐 [SERVER] Applying socket authentication middleware...');
io.use(socketAuthMiddleware);

// Load chat socket handlers
console.log('💬 [SERVER] Loading chat socket handlers...');
require('./src/sockets/chat.socket')(io);

// Load notification socket handlers
console.log('🔔 [SERVER] Loading notification socket handlers...');
require('./src/sockets/notifications.socket')(io);

console.log('✅ [SERVER] Socket.IO initialized successfully\n');

// Legacy admin socket events (kept for backwards compatibility)
io.on("connection", (socket) => {
  socket.on("admin:join", () => {
    socket.join("admins");
  });
  socket.on("admin:leave", () => {
    socket.leave("admins");
  });
});

// DB connection function (mongoose already required at top)

// Database connection function with caching for serverless
let isConnected = false;
// Track which cluster is currently active (1 = primary, 2 = fallback)
let activeCluster = 0;

/**
 * Attempt a single mongoose.connect with a timeout.
 * Returns true on success, throws on failure.
 */
async function tryConnect(uri, options) {
  await mongoose.connect(uri, options);
  return true;
}

/**
 * Connect to a URI with retry logic.
 * @param {string} uri
 * @param {object} options  - Mongoose connect options
 * @param {number} retries
 * @param {number} delay    - ms between retries
 */
async function connectWithRetry(uri, options, retries = 3, delay = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await tryConnect(uri, options);
      return; // success
    } catch (err) {
      logger.logError(err, {
        context: 'database_connection_attempt',
        attempt,
        maxRetries: retries,
        uri: uri.replace(/\/\/.*@/, '//***:***@'),
        readyState: mongoose.connection.readyState
      });
      if (attempt < retries) {
        console.log(`⚠️  Connection attempt ${attempt} failed. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw err; // exhausted retries
      }
    }
  }
}

/**
 * Core cluster-aware connection logic.
 * Tries Cluster 1 (MONGO_URI) first; falls over to Cluster 2 (MONGO_URI_2) if
 * Cluster 1 is unavailable or not configured.
 *
 * Call this both on startup and from the 'disconnected' handler so the server
 * can self-heal at runtime.
 */
async function connectDB(retries = 3, delay = 2000) {
  // Already connected — nothing to do
  if (mongoose.connection.readyState === 1) {
    console.log("📦 Using existing database connection");
    isConnected = true;
    return;
  }

  const cluster1Uri = process.env.MONGO_URI;
  const cluster2Uri = process.env.MONGO_URI_2;
  const localUri    = "mongodb://localhost:27017/robotrick";
  const isProduction = process.env.NODE_ENV === "production";

  const atlasOptions = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 2,
    retryWrites: true,
    retryReads: true
  };

  const localOptions = {
    serverSelectionTimeoutMS: 3000,
    socketTimeoutMS: 45000
  };

  /**
   * Try an ordered list of { label, uri, options } entries.
   * Stops at the first successful connection.
   */
  async function tryInOrder(candidates) {
    const errors = [];
    for (const { label, uri, options } of candidates) {
      if (!uri) {
        console.log(`⏭️  Skipping ${label} — URI not configured`);
        continue;
      }
      try {
        console.log(`🔄 Connecting to ${label}...`);
        await connectWithRetry(uri, options, retries, delay);
        console.log(`✅ Connected to ${label} successfully`);
        return label; // return which one succeeded
      } catch (err) {
        console.log(`❌ Failed to connect to ${label}: ${err.message}`);
        errors.push({ label, message: err.message });
      }
    }
    // All candidates exhausted
    const summary = errors.map(e => `${e.label}: ${e.message}`).join(' | ');
    throw new Error(`All database clusters failed. Details — ${summary}`);
  }

  try {
    let connectedLabel;

    if (isProduction) {
      // Production: Cluster 1 → Cluster 2
      if (!cluster1Uri && !cluster2Uri) {
        throw new Error("No MongoDB URI configured in production. Set MONGO_URI and/or MONGO_URI_2.");
      }
      connectedLabel = await tryInOrder([
        { label: 'MongoDB Cluster 1 (Primary)',  uri: cluster1Uri, options: atlasOptions },
        { label: 'MongoDB Cluster 2 (Fallback)', uri: cluster2Uri, options: atlasOptions },
      ]);
    } else {
      // Development: Local → Cluster 1 → Cluster 2
      connectedLabel = await tryInOrder([
        { label: 'Local MongoDB',                uri: localUri,    options: localOptions },
        { label: 'MongoDB Cluster 1 (Primary)',  uri: cluster1Uri, options: atlasOptions },
        { label: 'MongoDB Cluster 2 (Fallback)', uri: cluster2Uri, options: atlasOptions },
      ]);
    }

    // Record which cluster won
    if (connectedLabel.includes('Cluster 1')) activeCluster = 1;
    else if (connectedLabel.includes('Cluster 2')) activeCluster = 2;
    else activeCluster = 0; // local
    isConnected = true;

    // ── Connection event handlers (register only once) ──────────────────
    if (mongoose.connection.listenerCount('error') === 0) {
      mongoose.connection.on('error', (err) => {
        logger.logError(err, { context: 'database_connection_error', activeCluster });
      });

      mongoose.connection.on('disconnected', () => {
        logger.logError(new Error('MongoDB disconnected'), {
          context: 'database_disconnected',
          previousCluster: activeCluster
        });
        isConnected = false;
        activeCluster = 0;

        // Auto-failover: attempt to reconnect (Mongoose's own retry may not
        // switch clusters, so we drive it ourselves after a short pause)
        console.log('🔁 Attempting automatic reconnection / cluster failover...');
        setTimeout(() => {
          connectDB(2, 3000).then(() => {
            console.log(`✅ Failover reconnection succeeded (cluster ${activeCluster})`);
          }).catch((err) => {
            console.error('❌ Failover reconnection failed:', err.message);
          });
        }, 5000);
      });

      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected');
        logger.info('MongoDB reconnected', { context: 'database_reconnected', activeCluster });
        isConnected = true;
      });
    }

  } catch (error) {
    const msg = error.message || 'Unknown database connection error';
    const isNetworkError = msg.includes('timeout') ||
                           msg.includes('ECONNREFUSED') ||
                           msg.includes('ENOTFOUND');

    logger.logError(error, {
      context: 'database_connection_failed',
      isNetworkError,
      readyState: mongoose.connection.readyState,
      errorName: error.name
    });

    if (isNetworkError) {
      throw new Error(`Database connection failed: Unable to reach any MongoDB cluster. Check MONGO_URI / MONGO_URI_2 and network connectivity.`);
    } else if (msg.includes('authentication')) {
      throw new Error(`Database connection failed: Authentication error. Check credentials in MONGO_URI / MONGO_URI_2.`);
    } else {
      throw new Error(`Database connection failed: ${msg}`);
    }
  }
}

// Note: DB connection middleware removed from here - DB connects on startup for local
// and on first request for Vercel serverless (handled in start function)

// Start server for local development ONLY
if (process.env.VERCEL !== "1") {
  const port = process.env.PORT || 4889;

  // Connect to database then start server
  connectDB()
    .then(() => {
      const { startTripScheduler } = require('./src/services/transport.scheduler');
      startTripScheduler();

      server.listen(port, () => {
        console.log(`✅ Server started successfully on port ${port}`);
        console.log(`📍 API: http://localhost:${port}/api`);
        console.log(`🏥 Health: http://localhost:${port}/api/health`);
      });
    })
    .catch((error) => {
      console.error("❌ Failed to start server:", error.message);
      if (error.stack) {
        console.error("Stack trace:", error.stack.split('\n').slice(0, 5).join('\n'));
      }
      console.error("📍 Check the error above and fix the issue before restarting.");
      process.exit(1);
    });
} else {
  // In Vercel, connect to DB on first request (already handled by connectDB caching)
  console.log("🔧 Running in Vercel serverless environment");
}

// Export app immediately for Vercel (don't wait for anything)
module.exports = app;
