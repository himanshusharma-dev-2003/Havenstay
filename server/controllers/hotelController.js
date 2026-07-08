const NodeCache = require("node-cache");
const { validationResult } = require("express-validator");
const Hotel = require("../models/Hotel");
const Room  = require("../models/Room");
const { AppError, catchAsync } = require("../utils/errors");

const cache = new NodeCache({ stdTTL: 60, checkperiod: 30 }); // 60s TTL

// ── GET /api/hotels ───────────────────────────────────────────────
exports.getAllHotels = catchAsync(async (req, res) => {
  const { city, minPrice, maxPrice, rating, category, featured, page = 1, limit = 12, sort = "-rating" } = req.query;

  // Build cache key from query string
  const cacheKey = `hotels:${JSON.stringify(req.query)}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  const filter = { isActive: true };
  if (req.user && req.user.role === "owner") {
    filter.owner = req.user.id;
  }

  if (city)     filter.city     = new RegExp(city, "i");
  if (category) filter.category = category;
  if (featured) filter.featured = featured === "true";
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
    .lean();

  const response = {
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    data: hotels,
  };

  cache.set(cacheKey, response);
  res.json(response);
});

// ── GET /api/hotels/:id ───────────────────────────────────────────
exports.getHotelById = catchAsync(async (req, res, next) => {
  const cacheKey = `hotel:${req.params.id}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  const hotel = await Hotel.findById(req.params.id).lean();
  if (!hotel) return next(new AppError("Hotel not found.", 404));

  // Attach rooms
  const rooms = await Room.find({ hotelId: hotel._id, isActive: true }).lean();
  const response = { success: true, data: { ...hotel, rooms } };

  cache.set(cacheKey, response);
  res.json(response);
});

// ── POST /api/hotels (admin/owner) ──────────────────────────────────────
exports.createHotel = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMsg = errors.array()[0].msg || "Validation failed.";
    return res.status(400).json({ success: false, message: errorMsg, errors: errors.array() });
  }

  if (req.user.role === "owner") {
    req.body.owner = req.user.id;
  }

  const hotel = await Hotel.create(req.body);
  cache.flushAll();
  res.status(201).json({ success: true, data: hotel });
});

// ── PUT /api/hotels/:id (admin/owner) ───────────────────────────────────
exports.updateHotel = catchAsync(async (req, res, next) => {
  const hotel = await Hotel.findById(req.params.id);
  if (!hotel) return next(new AppError("Hotel not found.", 404));

  if (req.user.role === "owner" && hotel.owner?.toString() !== req.user.id) {
    return next(new AppError("Unauthorized.", 403));
  }

  Object.assign(hotel, req.body);
  await hotel.save();

  cache.flushAll();
  res.json({ success: true, data: hotel });
});

// ── DELETE /api/hotels/:id (admin/owner) ───────────────────────────────
exports.deleteHotel = catchAsync(async (req, res, next) => {
  const hotel = await Hotel.findById(req.params.id);
  if (!hotel) return next(new AppError("Hotel not found.", 404));

  if (req.user.role === "owner" && hotel.owner?.toString() !== req.user.id) {
    return next(new AppError("Unauthorized.", 403));
  }

  hotel.isActive = false;
  await hotel.save();

  cache.flushAll();
  res.json({ success: true, message: "Hotel deactivated." });
});
