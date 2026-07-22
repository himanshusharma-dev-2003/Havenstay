/**
 * Centralised application configuration.
 *
 * All environment variables are resolved here in one place.
 * Controllers and middleware should import from this module rather than
 * reading process.env directly — this makes testing easier (single mock point)
 * and documents every required variable in one canonical location.
 *
 * Validation is handled by server/env.js on startup; by the time this
 * module is imported, all required variables are guaranteed to be present.
 */

const { AUTH } = require('../constants');

const config = Object.freeze({
  // ── Server ──────────────────────────────────────────────────────
  port:     Number(process.env.PORT) || 5000,
  nodeEnv:  process.env.NODE_ENV || 'development',
  isDev:    process.env.NODE_ENV !== 'production',
  isProd:   process.env.NODE_ENV === 'production',
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  // ── Database ─────────────────────────────────────────────────────
  mongoUri: process.env.MONGO_URI,

  // ── JWT ──────────────────────────────────────────────────────────
  jwt: Object.freeze({
    accessSecret:  process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiry:  process.env.JWT_ACCESS_EXPIRES  || AUTH.ACCESS_TOKEN_EXPIRY,
    refreshExpiry: process.env.JWT_REFRESH_EXPIRES || AUTH.REFRESH_TOKEN_EXPIRY,
  }),

  // ── CORS ──────────────────────────────────────────────────────────
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',

  // ── Razorpay ──────────────────────────────────────────────────────
  razorpay: Object.freeze({
    keyId:     process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    isEnabled: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
  }),
});

module.exports = config;
