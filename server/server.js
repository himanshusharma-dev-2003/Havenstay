require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const authRoutes    = require("./routes/auth");
const hotelRoutes   = require("./routes/hotels");
const roomRoutes    = require("./routes/rooms");
const bookingRoutes = require("./routes/bookings");
const chatRoutes    = require("./routes/chat");

const app = express();

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
app.use("/api/chat",     chatRoutes);

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
const http = require("http");
const { initSocket } = require("./utils/socket");

const server = http.createServer(app);
initSocket(server);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    server.listen(PORT, () => {
      console.log(`🚀 Restrip API running on http://localhost:${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

module.exports = server;
