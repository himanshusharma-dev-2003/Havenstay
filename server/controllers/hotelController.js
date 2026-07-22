const NodeCache = require('node-cache');
const { validationResult } = require('express-validator');
const Hotel = require('../models/Hotel');
const Room  = require('../models/Room');
const { AppError, catchAsync } = require('../utils/errors');
const { CACHE_TTL, PAGINATION } = require('../constants');

/**
 * In-memory cache for hotel responses.
 *
 * Using node-cache (single-process, no infra requirement) for simplicity
 * in development. In a multi-instance production deployment this should be
 * replaced with a shared Redis cache to prevent cache inconsistencies between
 * pods. The interface is intentionally abstracted so the switch is a one-line
 * adapter change.
 *
 * TTL values are defined in constants/index.js for easy tuning.
 */
const cache = new NodeCache({ stdTTL: CACHE_TTL.HOTELS_LIST, checkperiod: CACHE_TTL.CHECK_PERIOD });

/**
 * GET /api/hotels
 *
 * Returns a paginated, filtered list of active hotels.
 * Cached per unique query-string for CACHE_TTL.HOTELS_LIST seconds.
 *
 * @query {string}  [city]      - Filter by city (case-insensitive partial match)
 * @query {string}  [category]  - Filter by category enum value
 * @query {boolean} [featured]  - Filter featured hotels only
 * @query {number}  [rating]    - Minimum rating (inclusive)
 * @query {number}  [minPrice]  - Minimum cheapestPrice
 * @query {number}  [maxPrice]  - Maximum cheapestPrice
 * @query {number}  [page=1]    - Page number
 * @query {number}  [limit=12]  - Items per page
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

  // Cache key derived from the full query string to handle all filter combinations
  const cacheKey = `hotels:${JSON.stringify(req.query)}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

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

  cache.set(cacheKey, response);
  res.json(response);
});

/**
 * GET /api/hotels/:id
 *
 * Returns a single hotel with its active rooms attached.
 * Cached per hotel ID for CACHE_TTL.HOTEL_DETAIL seconds.
 *
 * @param {string} id - MongoDB ObjectId
 * @returns {{ success: true, data: Hotel & { rooms: Room[] } }}
 * @throws {404} Hotel not found
 */
exports.getHotelById = catchAsync(async (req, res, next) => {
  const cacheKey = `hotel:${req.params.id}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  const hotel = await Hotel.findById(req.params.id).lean();
  if (!hotel) return next(new AppError('Hotel not found.', 404));

  // Fetch rooms separately — the virtual populate on Hotel model can also do
  // this, but explicit fetching gives us the isActive filter in one query.
  const rooms = await Room.find({ hotelId: hotel._id, isActive: true }).lean();
  const response = { success: true, data: { ...hotel, rooms } };

  cache.set(cacheKey, response, CACHE_TTL.HOTEL_DETAIL);
  res.json(response);
});

/**
 * POST /api/hotels  [Admin]
 *
 * Creates a new hotel. Validates request body via express-validator rules
 * defined in the route file. Flushes the hotel listing cache on success.
 *
 * @body {object} hotel data (name, city, country, address, description, cheapestPrice, ...)
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
  cache.flushAll(); // Invalidate listing cache so new hotel appears immediately
  res.status(201).json({ success: true, data: hotel });
});

/**
 * PUT /api/hotels/:id  [Admin]
 *
 * Updates an existing hotel. Runs Mongoose validators on the update.
 * Flushes entire hotel cache on success.
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
  cache.flushAll();
  res.json({ success: true, data: hotel });
});

/**
 * DELETE /api/hotels/:id  [Admin]
 *
 * Soft-deletes a hotel by setting isActive=false.
 * The hotel record is retained in MongoDB for historical booking references.
 *
 * @param {string} id - MongoDB ObjectId
 * @returns {{ success: true, message: string }}
 * @throws {404} Hotel not found
 */
exports.deleteHotel = catchAsync(async (req, res, next) => {
  const hotel = await Hotel.findByIdAndUpdate(req.params.id, { isActive: false });
  if (!hotel) return next(new AppError('Hotel not found.', 404));
  cache.flushAll();
  res.json({ success: true, message: 'Hotel deactivated successfully.' });
});
