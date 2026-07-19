// Load & validate environment early
const env = require("./env");

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const { httpLogger, logger } = require("./logger");

const authRoutes    = require("./routes/auth");
const hotelRoutes   = require("./routes/hotels");
const roomRoutes    = require("./routes/rooms");
const bookingRoutes = require("./routes/bookings");

const app = express();

// Attach structured request logger (adds req.id)
app.use(httpLogger);
// Expose request id to downstream middleware/clients
app.use((req, res, next) => {
  res.setHeader('X-Request-Id', req.id);
  next();
});

// ── Security middleware ───────────────────────────────────────────
app.use(helmet());
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:3000",
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS blocked for this origin."));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ── General middleware ────────────────────────────────────────────
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ── Rate limiting ─────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { success: false, message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 120,
  message: { success: false, message: "Rate limit exceeded." },
});

app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);

// ── Routes ────────────────────────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/hotels",   hotelRoutes);
app.use("/api/rooms",    roomRoutes);
app.use("/api/bookings", bookingRoutes);

// ── Health check ──────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "OK",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── 404 handler ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found.` });
});

// ── Global error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  // Structured logging
  logger.error({ err, path: req.path, method: req.method, reqId: req.id }, err.message || 'Unhandled error');

  const statusCode = err.statusCode || 500;
  const payload = {
    success: false,
    message: err.isOperational ? err.message : 'Internal server error',
  };
  if (process.env.NODE_ENV === 'development') payload.stack = err.stack;

  res.status(statusCode).json(payload);
});

// Export app for tests and other runners. Do NOT connect to DB here; call start() when launching normally.
module.exports = app;

// Start server if invoked directly
if (require.main === module) {
  const mongoose = require('mongoose');

  mongoose
    .connect(env.mongoUri)
    .then(() => {
      logger.info('✅ MongoDB connected');

      const PORT = process.env.PORT || 5000;
      const server = app.listen(env.port || PORT, () => {
        logger.info(`🚀 Restrip API running on http://localhost:${env.port || PORT}`);
        logger.info(`📋 Health check: http://localhost:${env.port || PORT}/api/health`);
      });

      // Graceful shutdown
      const shutdown = async (signal) => {
        try {
          logger.info(`${signal} received: closing HTTP server and MongoDB connection...`);
          server.close(() => logger.info('HTTP server closed'));
          await mongoose.disconnect();
          logger.info('MongoDB disconnected');
          process.exit(0);
        } catch (err) {
          logger.error('Error during shutdown', err);
          process.exit(1);
        }
      };

      process.on('SIGTERM', () => shutdown('SIGTERM'));
      process.on('SIGINT',  () => shutdown('SIGINT'));
    })
    .catch((err) => {
      logger.error('❌ MongoDB connection failed:', err.message || err);
      process.exit(1);
    });
}


// ── Security middleware ───────────────────────────────────────────
app.use(helmet());
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:3000",
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser tools (no Origin header) and explicitly approved origins.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow Vercel preview/production deployment URLs.
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
      return callback(null, true);
    }

    return callback(new Error("CORS blocked for this origin."));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ── General middleware ────────────────────────────────────────────
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ── Rate limiting ─────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { success: false, message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 120,
  message: { success: false, message: "Rate limit exceeded." },
});

app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);

// ── Routes ────────────────────────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/hotels",   hotelRoutes);
app.use("/api/rooms",    roomRoutes);
app.use("/api/bookings", bookingRoutes);

// ── Health check ──────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "OK",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── 404 handler ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found.` });
});

// ── Global error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.stack}`);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ── Database + Start ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(env.mongoUri)
  .then(() => {
    logger.info('✅ MongoDB connected');

    const server = app.listen(env.port || PORT, () => {
      logger.info(`🚀 Restrip API running on http://localhost:${env.port || PORT}`);
      logger.info(`📋 Health check: http://localhost:${env.port || PORT}/api/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      try {
        logger.info(`${signal} received: closing HTTP server and MongoDB connection...`);
        server.close(() => logger.info('HTTP server closed'));
        await mongoose.disconnect();
        logger.info('MongoDB disconnected');
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown', err);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));
  })
  .catch((err) => {
    logger.error('❌ MongoDB connection failed:', err.message || err);
    process.exit(1);
  });

module.exports = app;
