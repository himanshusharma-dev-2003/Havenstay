const { validationResult } = require('express-validator');
const Room  = require('../models/Room');
const Hotel = require('../models/Hotel');
const { AppError, catchAsync } = require('../utils/errors');

/**
 * Generates an array of Date objects for each night in a stay range.
 * Shared utility — also exists in bookingController.js. In a larger codebase
 * this would live in utils/dateHelpers.js; kept local here for simplicity.
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
 * top-level `hasAvailableRooms` boolean — used by the client to grey out
 * fully-booked rooms without an additional API call.
 *
 * @query {string}  hotelId           - Required. Hotel MongoDB ObjectId
 * @query {string}  [checkIn]         - ISO date string
 * @query {string}  [checkOut]        - ISO date string
 * @returns {{ success: true, data: Room[] }}
 * @throws {400} Missing hotelId
 */
exports.getRoomsByHotel = catchAsync(async (req, res, next) => {
  const { hotelId, checkIn, checkOut } = req.query;
  if (!hotelId) return next(new AppError('hotelId query param is required.', 400));

  const rooms = await Room.find({ hotelId, isActive: true }).lean();

  // Availability annotation — only performed when date params are supplied
  if (checkIn && checkOut) {
    const requestedDates = getDateRange(checkIn, checkOut);
    for (const room of rooms) {
      room.roomNumbers = room.roomNumbers.map((rn) => {
        const bookedSet    = new Set(rn.bookedDates.map((d) => new Date(d).toDateString()));
        const isAvailable  = requestedDates.every((d) => !bookedSet.has(d.toDateString()));
        return { ...rn, isAvailable };
      });
      room.hasAvailableRooms = room.roomNumbers.some((rn) => rn.isAvailable);
    }
  }

  res.json({ success: true, data: rooms });
});

/**
 * GET /api/rooms/:id
 *
 * Returns a single room with its parent hotel name and city populated.
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
 * As a side-effect, updates the hotel's cheapestPrice if this room's
 * price is lower — keeping the hotel listing accurate without a separate update.
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

  res.status(201).json({ success: true, data: room });
});

/**
 * PUT /api/rooms/:id  [Admin]
 *
 * Updates room metadata. Does not modify bookedDates — those are managed
 * exclusively by the booking/cancellation flow.
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
  res.json({ success: true, data: room });
});

/**
 * DELETE /api/rooms/:id  [Admin]
 *
 * Soft-deletes a room (isActive=false). Historical bookings referencing
 * this room are preserved in MongoDB.
 *
 * @auth Admin
 * @param {string} id - MongoDB ObjectId
 * @returns {{ success: true, message: string }}
 * @throws {404} Room not found
 */
exports.deleteRoom = catchAsync(async (req, res, next) => {
  const room = await Room.findByIdAndUpdate(req.params.id, { isActive: false });
  if (!room) return next(new AppError('Room not found.', 404));
  res.json({ success: true, message: 'Room deactivated successfully.' });
});

/**
 * GET /api/rooms/:id/availability?checkIn=&checkOut=
 *
 * Returns per-room-number availability for the given date range.
 * Used by the booking form to show which physical room numbers are free.
 *
 * @param {string} id    - Room MongoDB ObjectId
 * @query {string} checkIn
 * @query {string} checkOut
 * @returns {{ success: true, data: { roomId, hasAvailability, availability: { roomNumber, isAvailable }[] } }}
 * @throws {400} Missing date params
 * @throws {404} Room not found
 */
exports.checkAvailability = catchAsync(async (req, res, next) => {
  const { checkIn, checkOut } = req.query;
  if (!checkIn || !checkOut) {
    return next(new AppError('checkIn and checkOut query params are required.', 400));
  }

  const room = await Room.findById(req.params.id).lean();
  if (!room) return next(new AppError('Room not found.', 404));

  const requestedDates = getDateRange(checkIn, checkOut);
  const availability   = room.roomNumbers.map((rn) => {
    const bookedSet   = new Set(rn.bookedDates.map((d) => new Date(d).toDateString()));
    const isAvailable = requestedDates.every((d) => !bookedSet.has(d.toDateString()));
    return { roomNumber: rn.number, isAvailable };
  });

  res.json({
    success: true,
    data: {
      roomId:          room._id,
      hasAvailability: availability.some((a) => a.isAvailable),
      availability,
    },
  });
});
