// Load & validate environment variables early — will exit if required vars are missing
const env = require('./env');

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const compression  = require('compression');
const cookieParser = require('cookie-parser');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');

const { httpLogger, logger } = require('./logger');
const config         = require('./config');
const errorHandler   = require('./middleware/errorHandler');
const { connectRedis, disconnectRedis } = require('./config/redis');

const authRoutes    = require('./routes/auth');
const hotelRoutes   = require('./routes/hotels');
const roomRoutes    = require('./routes/rooms');
const bookingRoutes = require('./routes/bookings');

const app = express();

// ── Request ID + structured logging ──────────────────────────────
// Attaches a unique request ID to every incoming request via pino-http.
// The ID is forwarded in the X-Request-Id response header for client-side
// correlation and distributed tracing.
app.use(httpLogger);
app.use((req, res, next) => {
  res.setHeader('X-Request-Id', req.id);
  next();
});

// ── Security headers ──────────────────────────────────────────────
// helmet() sets ~14 security-related HTTP headers (CSP, HSTS, etc.)
app.use(helmet());

const allowedOrigins = [
  config.clientUrl,
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server requests (no Origin header) and approved origins
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    // Allow Vercel preview deployment URLs (*.vercel.app)
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return callback(null, true);
    return callback(new Error('CORS: origin not allowed.'));
  },
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── General middleware ────────────────────────────────────────────
app.use(compression());       // Brotli/gzip response compression
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));         // Prevent large-payload DoS
app.use(express.urlencoded({ extended: true }));

if (config.isDev) {
  app.use(morgan('dev')); // Concise colourised request logging in development
}

// ── Rate limiting ─────────────────────────────────────────────────
// Auth endpoints get a stricter limit to slow brute-force / credential stuffing.
const authLimiter = rateLimit({
  windowMs:       15 * 60 * 1000, // 15 minutes
  max:            20,
  message:        { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// General API rate limit — 120 req/min covers normal usage with headroom
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      120,
  message:  { success: false, message: 'Rate limit exceeded.' },
});

app.use('/api/auth', authLimiter);
app.use('/auth',     authLimiter);
app.use('/api',      apiLimiter);

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/hotels',   hotelRoutes);
app.use('/api/rooms',    roomRoutes);
app.use('/api/bookings', bookingRoutes);

// Fallback aliases without /api prefix (handles direct calls or legacy clients)
app.use('/auth',     authRoutes);
app.use('/hotels',   hotelRoutes);
app.use('/rooms',    roomRoutes);
app.use('/bookings', bookingRoutes);

// ── Health check ──────────────────────────────────────────────────
// Simple liveness probe — used by Docker HEALTHCHECK and cloud platform monitors.
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    success:     true,
    status:      'OK',
    environment: config.nodeEnv,
    timestamp:   new Date().toISOString(),
  });
});

// ── 404 handler ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

// ── Global error handler ──────────────────────────────────────────
// Must be last — Express identifies error-handling middleware by its 4-argument signature.
app.use(errorHandler);

// ── Export for testing ────────────────────────────────────────────
// Tests import `app` directly and manage their own mongoose connection.
module.exports = app;

// ── Bootstrap (only when run directly, not when required by tests) ─
if (require.main === module) {
  const mongoose = require('mongoose');

  // Connect to MongoDB (required) and Redis (optional — app runs without it)
  const bootstrap = async () => {
    try {
      await mongoose.connect(config.mongoUri);
      logger.info('✅ MongoDB connected');

      // Redis connection is non-blocking — if it fails, the app continues
      // and the cache service falls back to MongoDB transparently.
      await connectRedis();

      const server = app.listen(config.port, () => {
        logger.info(`🚀 HavenStay API running  →  http://localhost:${config.port}`);
        logger.info(`📋 Health check           →  http://localhost:${config.port}/api/health`);
      });

      // ── Graceful shutdown ──────────────────────────────────────────
      // Allows in-flight requests to complete before the process exits.
      const shutdown = async (signal) => {
        try {
          logger.info(`${signal} received — shutting down gracefully…`);
          server.close(() => logger.info('HTTP server closed'));
          await mongoose.disconnect();
          logger.info('MongoDB disconnected');
          await disconnectRedis();
          process.exit(0);
        } catch (err) {
          logger.error({ err }, 'Error during graceful shutdown');
          process.exit(1);
        }
      };

      process.on('SIGTERM', () => shutdown('SIGTERM'));
      process.on('SIGINT',  () => shutdown('SIGINT'));
    } catch (err) {
      logger.error({ err }, '❌ Bootstrap failed');
      process.exit(1);
    }
  };

  bootstrap();
}
