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
  DEFAULT_PAGE:          1,
  DEFAULT_HOTEL_LIMIT:   12,
  DEFAULT_BOOKING_LIMIT: 10,
  ADMIN_BOOKING_LIMIT:   20,
});

// ── Redis Cache TTLs (seconds) ────────────────────────────────────
//
// TTL rationale:
//   HOTELS_LIST (300s / 5 min):
//     Hotel listings are the most queried endpoint. 5 minutes is long enough
//     to absorb traffic spikes but short enough that a new hotel created by
//     an admin appears quickly. Write-through invalidation ensures cache is
//     cleared immediately on any mutation regardless of TTL.
//
//   HOTEL_DETAIL (900s / 15 min):
//     A single hotel's details (description, photos, amenities) rarely change.
//     15 minutes reduces MongoDB reads on popular hotel pages significantly.
//     Cache is invalidated immediately when the hotel or any of its rooms
//     are updated.
//
//   FEATURED_HOTELS (600s / 10 min):
//     Featured hotels appear on the homepage — a hot path with no auth.
//     10-minute TTL with explicit invalidation on hotel update/create/delete.
//
//   ROOM_AVAILABILITY (60s / 1 min):
//     Availability data is booking-critical — stale data could show a
//     room as available when it's already taken. 60 seconds is the minimum
//     useful caching interval; write-through invalidation on every
//     booking creation and cancellation keeps this accurate.
//
//   ROOMS_BY_HOTEL (300s / 5 min):
//     Room list for a hotel (without availability). Invalidated on room
//     create/update/delete.
//
const CACHE_TTL = Object.freeze({
  HOTELS_LIST:       300,   // 5 minutes
  HOTEL_DETAIL:      900,   // 15 minutes
  FEATURED_HOTELS:   600,   // 10 minutes
  ROOM_AVAILABILITY: 60,    // 1 minute  — booking-critical, must be fresh
  ROOMS_BY_HOTEL:    300,   // 5 minutes
});

// ── JWT / Cookie lifetimes ────────────────────────────────────────
const AUTH = Object.freeze({
  ACCESS_TOKEN_EXPIRY:    '15m',
  REFRESH_TOKEN_EXPIRY:   '7d',
  ACCESS_COOKIE_MAX_AGE:  15 * 60 * 1000,          // 15 minutes in ms
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
