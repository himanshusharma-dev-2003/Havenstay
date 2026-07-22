const { validationResult } = require('express-validator');
const Hotel        = require('../models/Hotel');
const Room         = require('../models/Room');
const { AppError, catchAsync } = require('../utils/errors');
const { CACHE_TTL, PAGINATION } = require('../constants');
const cache        = require('../services/cache.service');

// ── Cache key helpers ─────────────────────────────────────────────
// Centralise key construction here — if a key pattern ever needs to change,
// there is exactly one place to update it.
const CK = {
  hotelList:    (query) => `hotels:${JSON.stringify(query)}`,
  hotelDetail:  (id)    => `hotel:${id}`,
  featured:     ()      => 'featured-hotels',
};

/**
 * GET /api/hotels
 *
 * Returns a paginated, filtered list of active hotels.
 *
 * Caching strategy:
 *   Key    : hotels:{JSON.stringify(queryParams)}
 *   TTL    : 300 seconds (5 minutes)
 *   Reason : Hotel listings are the highest-traffic endpoint. 5-minute TTL
 *            absorbs traffic spikes. Write-through invalidation (delPattern
 *            on any mutation) guarantees the cache never serves stale data
 *            beyond the TTL when an admin makes changes.
 *
 * @query {string}  [city]         - Filter by city (case-insensitive partial match)
 * @query {string}  [category]     - Filter by category enum value
 * @query {boolean} [featured]     - Filter featured hotels only
 * @query {number}  [rating]       - Minimum rating (inclusive)
 * @query {number}  [minPrice]     - Minimum cheapestPrice
 * @query {number}  [maxPrice]     - Maximum cheapestPrice
 * @query {number}  [page=1]       - Page number
 * @query {number}  [limit=12]     - Items per page
 * @query {string}  [sort=-rating] - Mongoose sort string
 *
 * @returns {{ success: true, total: number, page: number, pages: number, data: Hotel[] }}
 */
exports.getAllHotels = catchAsync(async (req, res) => {
  const {
    city, minPrice, maxPrice, rating, category, featured,
    page  = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_HOTEL_LIMIT,
    sort  = '-rating',
  } = req.query;

  // Use a dedicated key for the featured-hotels hot path so it can be
  // invalidated independently of regular listing queries.
  const isFeaturedOnly = featured === 'true' && Object.keys(req.query).length === 1;
  const cacheKey = isFeaturedOnly
    ? CK.featured()
    : CK.hotelList(req.query);

  const ttl = isFeaturedOnly ? CACHE_TTL.FEATURED_HOTELS : CACHE_TTL.HOTELS_LIST;

  const cached = await cache.get(cacheKey);
  if (cached) return res.json(cached);

  // ── Cache miss → query MongoDB ────────────────────────────────
  const filter = { isActive: true };
  if (city)     filter.city     = new RegExp(city, 'i');
  if (category) filter.category = category;
  if (featured) filter.featured = featured === 'true';
  if (rating)   filter.rating   = { $gte: Number(rating) };
  if (minPrice || maxPrice) {
    filter.cheapestPrice = {};
    if (minPrice) filter.cheapestPrice.$gte = Number(minPrice);
    if (maxPrice) filter.cheapestPrice.$lte = Number(maxPrice);
  }

  const skip  = (Number(page) - 1) * Number(limit);
  const total = await Hotel.countDocuments(filter);

  const hotels = await Hotel.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(Number(limit))
    .lean();  // .lean() returns plain objects, ~40% faster than full Mongoose documents

  const response = {
    success: true,
    total,
    page:  Number(page),
    pages: Math.ceil(total / Number(limit)),
    data:  hotels,
  };

  await cache.set(cacheKey, response, ttl);
  res.json(response);
});

/**
 * GET /api/hotels/:id
 *
 * Returns a single hotel with its active rooms attached.
 *
 * Caching strategy:
 *   Key    : hotel:{id}
 *   TTL    : 900 seconds (15 minutes)
 *   Reason : Individual hotel pages are read far more than written.
 *            15-minute TTL is aggressive enough to substantially reduce
 *            MongoDB round-trips on popular hotels. Invalidated immediately
 *            on hotel update, delete, or any room mutation for that hotel.
 *
 * @param {string} id - MongoDB ObjectId
 * @returns {{ success: true, data: Hotel & { rooms: Room[] } }}
 * @throws {404} Hotel not found
 */
exports.getHotelById = catchAsync(async (req, res, next) => {
  const cacheKey = CK.hotelDetail(req.params.id);

  const cached = await cache.get(cacheKey);
  if (cached) return res.json(cached);

  const hotel = await Hotel.findById(req.params.id).lean();
  if (!hotel) return next(new AppError('Hotel not found.', 404));

  // Fetch rooms separately — the virtual populate on Hotel model can also do
  // this, but explicit fetching gives us the isActive filter in one query.
  const rooms    = await Room.find({ hotelId: hotel._id, isActive: true }).lean();
  const response = { success: true, data: { ...hotel, rooms } };

  await cache.set(cacheKey, response, CACHE_TTL.HOTEL_DETAIL);
  res.json(response);
});

/**
 * POST /api/hotels  [Admin]
 *
 * Creates a new hotel.
 *
 * Cache invalidation:
 *   - All hotel listing patterns (hotels:*) are cleared so the new hotel
 *     appears immediately in every listing query.
 *   - featured-hotels key is cleared separately because its key sits outside
 *     the hotels:* pattern.
 *
 * @body {object} hotel data (name, city, country, address, description, cheapestPrice, …)
 * @returns {{ success: true, data: Hotel }}
 * @throws {400} Validation errors
 */
exports.createHotel = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMsg = errors.array()[0].msg || 'Validation failed.';
    return res.status(400).json({ success: false, message: errorMsg, errors: errors.array() });
  }

  const hotel = await Hotel.create(req.body);

  // Invalidate listing caches — new hotel must appear immediately
  await Promise.all([
    cache.delPattern('hotels:*'),
    cache.del(CK.featured()),
  ]);

  res.status(201).json({ success: true, data: hotel });
});

/**
 * PUT /api/hotels/:id  [Admin]
 *
 * Updates an existing hotel.
 *
 * Cache invalidation:
 *   - The specific hotel:id key is deleted (detail page)
 *   - All hotel listing patterns are cleared (listing pages)
 *   - featured-hotels is cleared (may affect featured listing)
 *
 * @param {string} id - MongoDB ObjectId
 * @body {Partial<Hotel>} Fields to update
 * @returns {{ success: true, data: Hotel }}
 * @throws {404} Hotel not found
 */
exports.updateHotel = catchAsync(async (req, res, next) => {
  const hotel = await Hotel.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true },
  );
  if (!hotel) return next(new AppError('Hotel not found.', 404));

  // Targeted + listing invalidation in parallel
  await Promise.all([
    cache.del(CK.hotelDetail(req.params.id)),
    cache.delPattern('hotels:*'),
    cache.del(CK.featured()),
  ]);

  res.json({ success: true, data: hotel });
});

/**
 * DELETE /api/hotels/:id  [Admin]
 *
 * Soft-deletes a hotel by setting isActive=false.
 * The hotel record is retained in MongoDB for historical booking references.
 *
 * Cache invalidation: same as updateHotel — the hotel must disappear from
 * all listing pages immediately.
 *
 * @param {string} id - MongoDB ObjectId
 * @returns {{ success: true, message: string }}
 * @throws {404} Hotel not found
 */
exports.deleteHotel = catchAsync(async (req, res, next) => {
  const hotel = await Hotel.findByIdAndUpdate(req.params.id, { isActive: false });
  if (!hotel) return next(new AppError('Hotel not found.', 404));

  await Promise.all([
    cache.del(CK.hotelDetail(req.params.id)),
    cache.delPattern('hotels:*'),
    cache.del(CK.featured()),
  ]);

  res.json({ success: true, message: 'Hotel deactivated successfully.' });
});
