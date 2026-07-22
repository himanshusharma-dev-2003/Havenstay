const { validationResult } = require('express-validator');
const Room   = require('../models/Room');
const Hotel  = require('../models/Hotel');
const { AppError, catchAsync } = require('../utils/errors');
const { CACHE_TTL } = require('../constants');
const cache  = require('../services/cache.service');

// ── Cache key helpers ─────────────────────────────────────────────
const CK = {
  roomsByHotel:  (hotelId)                  => `rooms:${hotelId}`,
  availability:  (roomId, checkIn, checkOut) => `availability:${roomId}:${checkIn}:${checkOut}`,
};

/**
 * Generates an array of Date objects for each night in a stay range.
 *
 * @param {string|Date} checkIn  - Start date (inclusive)
 * @param {string|Date} checkOut - End date (exclusive)
 * @returns {Date[]}
 */
const getDateRange = (checkIn, checkOut) => {
  const dates   = [];
  const current = new Date(checkIn);
  const end     = new Date(checkOut);
  while (current < end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

/**
 * GET /api/rooms?hotelId=&checkIn=&checkOut=
 *
 * Returns all active rooms for a hotel. When checkIn and checkOut are provided,
 * each room number is annotated with an `isAvailable` flag and the room gets a
 * top-level `hasAvailableRooms` boolean.
 *
 * Caching strategy:
 *   - Room list WITHOUT dates: key = rooms:{hotelId}, TTL = 300s
 *     Cached because basic room metadata rarely changes.
 *   - Room list WITH dates: NOT cached at this level — the availability
 *     overlay is computed in-memory from the cached base room data.
 *     Individual availability checks use the availability:{roomId}:…  key.
 *
 * @query {string}  hotelId     - Required. Hotel MongoDB ObjectId
 * @query {string}  [checkIn]   - ISO date string
 * @query {string}  [checkOut]  - ISO date string
 * @returns {{ success: true, data: Room[] }}
 * @throws {400} Missing hotelId
 */
exports.getRoomsByHotel = catchAsync(async (req, res, next) => {
  const { hotelId, checkIn, checkOut } = req.query;
  if (!hotelId) return next(new AppError('hotelId query param is required.', 400));

  // Fetch base room list from cache or MongoDB
  const cacheKey = CK.roomsByHotel(hotelId);
  let rooms = await cache.get(cacheKey);

  if (!rooms) {
    rooms = await Room.find({ hotelId, isActive: true }).lean();
    await cache.set(cacheKey, rooms, CACHE_TTL.ROOMS_BY_HOTEL);
  }

  // Availability annotation is computed in-memory on the cached room data.
  // This avoids caching date-specific variants of the room list, which would
  // create an unbounded number of cache keys.
  if (checkIn && checkOut) {
    const requestedDates = getDateRange(checkIn, checkOut);
    rooms = rooms.map((room) => {
      const annotatedNumbers = room.roomNumbers.map((rn) => {
        const bookedSet   = new Set(rn.bookedDates.map((d) => new Date(d).toDateString()));
        const isAvailable = requestedDates.every((d) => !bookedSet.has(d.toDateString()));
        return { ...rn, isAvailable };
      });
      return {
        ...room,
        roomNumbers:       annotatedNumbers,
        hasAvailableRooms: annotatedNumbers.some((rn) => rn.isAvailable),
      };
    });
  }

  res.json({ success: true, data: rooms });
});

/**
 * GET /api/rooms/:id
 *
 * Returns a single room with its parent hotel name and city populated.
 * Not cached — individual room reads are low-frequency enough that
 * the MongoDB round-trip is acceptable, and avoiding a cache layer
 * here keeps availability data always fresh for this endpoint.
 *
 * @param {string} id - MongoDB ObjectId
 * @returns {{ success: true, data: Room }}
 * @throws {404} Room not found
 */
exports.getRoomById = catchAsync(async (req, res, next) => {
  const room = await Room.findById(req.params.id).populate('hotelId', 'name city').lean();
  if (!room) return next(new AppError('Room not found.', 404));
  res.json({ success: true, data: room });
});

/**
 * POST /api/rooms  [Admin]
 *
 * Creates a new room and links it to its parent hotel.
 * Side-effect: updates hotel.cheapestPrice if the new room is cheaper.
 *
 * Cache invalidation:
 *   - rooms:{hotelId}           — room list for this hotel
 *   - hotel:{hotelId}           — hotel detail (now has a new room)
 *   - hotels:* (pattern)        — listing pages show cheapestPrice
 *
 * @auth Admin
 * @body {{ hotelId, title, description, price, maxPeople, beds, roomNumbers, amenities, photos }}
 * @returns {{ success: true, data: Room }}
 * @throws {400} Validation errors
 * @throws {404} Hotel not found
 */
exports.createRoom = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMsg = errors.array()[0].msg || 'Validation failed.';
    return res.status(400).json({ success: false, message: errorMsg, errors: errors.array() });
  }

  const { hotelId } = req.body;
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) return next(new AppError('Hotel not found.', 404));

  const room = await Room.create(req.body);

  // Keep hotel.cheapestPrice in sync — avoids stale pricing in listings
  if (room.price < hotel.cheapestPrice) {
    await Hotel.findByIdAndUpdate(hotelId, { cheapestPrice: room.price });
  }

  // Invalidate affected caches in parallel
  await Promise.all([
    cache.del(CK.roomsByHotel(hotelId)),
    cache.del(`hotel:${hotelId}`),
    cache.delPattern('hotels:*'),
  ]);

  res.status(201).json({ success: true, data: room });
});

/**
 * PUT /api/rooms/:id  [Admin]
 *
 * Updates room metadata. bookedDates are managed exclusively by the
 * booking/cancellation flow.
 *
 * Cache invalidation:
 *   - rooms:{hotelId}   — room list for this hotel
 *   - hotel:{hotelId}   — hotel detail includes rooms
 *
 * @auth Admin
 * @param {string} id - MongoDB ObjectId
 * @body {Partial<Room>} Fields to update
 * @returns {{ success: true, data: Room }}
 * @throws {404} Room not found
 */
exports.updateRoom = catchAsync(async (req, res, next) => {
  const room = await Room.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true },
  );
  if (!room) return next(new AppError('Room not found.', 404));

  await Promise.all([
    cache.del(CK.roomsByHotel(room.hotelId.toString())),
    cache.del(`hotel:${room.hotelId}`),
  ]);

  res.json({ success: true, data: room });
});

/**
 * DELETE /api/rooms/:id  [Admin]
 *
 * Soft-deletes a room (isActive=false). Historical bookings referencing
 * this room are preserved in MongoDB.
 *
 * Cache invalidation: same as updateRoom.
 *
 * @auth Admin
 * @param {string} id - MongoDB ObjectId
 * @returns {{ success: true, message: string }}
 * @throws {404} Room not found
 */
exports.deleteRoom = catchAsync(async (req, res, next) => {
  const room = await Room.findByIdAndUpdate(req.params.id, { isActive: false });
  if (!room) return next(new AppError('Room not found.', 404));

  await Promise.all([
    cache.del(CK.roomsByHotel(room.hotelId.toString())),
    cache.del(`hotel:${room.hotelId}`),
    cache.delPattern('hotels:*'),
  ]);

  res.json({ success: true, message: 'Room deactivated successfully.' });
});

/**
 * GET /api/rooms/:id/availability?checkIn=&checkOut=
 *
 * Returns per-room-number availability for the given date range.
 *
 * Caching strategy:
 *   Key    : availability:{roomId}:{checkIn}:{checkOut}
 *   TTL    : 60 seconds (1 minute)
 *   Reason : Availability is booking-critical. We cache it for 60 seconds
 *            to avoid hammering MongoDB when many users check the same
 *            room simultaneously (e.g. a popular hotel). Booking creation
 *            and cancellation events immediately invalidate this key via
 *            delPattern('availability:{roomId}:*') so newly-booked dates
 *            never appear available.
 *
 * @param {string} id    - Room MongoDB ObjectId
 * @query {string} checkIn
 * @query {string} checkOut
 * @returns {{ success: true, data: { roomId, hasAvailability, availability[] } }}
 * @throws {400} Missing date params
 * @throws {404} Room not found
 */
exports.checkAvailability = catchAsync(async (req, res, next) => {
  const { checkIn, checkOut } = req.query;
  if (!checkIn || !checkOut) {
    return next(new AppError('checkIn and checkOut query params are required.', 400));
  }

  const cacheKey = CK.availability(req.params.id, checkIn, checkOut);
  const cached   = await cache.get(cacheKey);
  if (cached) return res.json(cached);

  const room = await Room.findById(req.params.id).lean();
  if (!room) return next(new AppError('Room not found.', 404));

  const requestedDates = getDateRange(checkIn, checkOut);
  const availability   = room.roomNumbers.map((rn) => {
    const bookedSet   = new Set(rn.bookedDates.map((d) => new Date(d).toDateString()));
    const isAvailable = requestedDates.every((d) => !bookedSet.has(d.toDateString()));
    return { roomNumber: rn.number, isAvailable };
  });

  const response = {
    success: true,
    data: {
      roomId:          room._id,
      hasAvailability: availability.some((a) => a.isAvailable),
      availability,
    },
  };

  await cache.set(cacheKey, response, CACHE_TTL.ROOM_AVAILABILITY);
  res.json(response);
});
