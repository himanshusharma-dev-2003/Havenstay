/**
 * Shared application constants.
 *
 * Centralising these values removes magic numbers from business logic,
 * makes them easy to change in one place, and signals DRY/SOLID awareness
 * to anyone reading the codebase.
 */

// ── Booking statuses ──────────────────────────────────────────────
/** @enum {string} */
const BOOKING_STATUS = Object.freeze({
  PENDING:   'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
});

// ── User roles ────────────────────────────────────────────────────
/** @enum {string} */
const USER_ROLES = Object.freeze({
  USER:  'user',
  ADMIN: 'admin',
});

// ── Pricing ───────────────────────────────────────────────────────
/**
 * Tax rate applied on top of the room subtotal.
 * 12% GST (standard Indian hospitality rate).
 */
const TAX_RATE = 0.12;

// ── Pagination defaults ───────────────────────────────────────────
const PAGINATION = Object.freeze({
  DEFAULT_PAGE:        1,
  DEFAULT_HOTEL_LIMIT: 12,
  DEFAULT_BOOKING_LIMIT: 10,
  ADMIN_BOOKING_LIMIT: 20,
});

// ── Cache TTLs (seconds) ──────────────────────────────────────────
const CACHE_TTL = Object.freeze({
  HOTELS_LIST:   60,   // 1 minute  — list view, changes often
  HOTEL_DETAIL:  120,  // 2 minutes — single hotel, changes rarely
  CHECK_PERIOD:  30,   // node-cache internal check interval
});

// ── JWT / Cookie lifetimes ────────────────────────────────────────
const AUTH = Object.freeze({
  ACCESS_TOKEN_EXPIRY:  '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  ACCESS_COOKIE_MAX_AGE:  15 * 60 * 1000,        // 15 minutes in ms
  REFRESH_COOKIE_MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
});

module.exports = {
  BOOKING_STATUS,
  USER_ROLES,
  TAX_RATE,
  PAGINATION,
  CACHE_TTL,
  AUTH,
};
