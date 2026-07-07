const { validationResult } = require("express-validator");
const Room  = require("../models/Room");
const Hotel = require("../models/Hotel");
const { AppError, catchAsync } = require("../utils/errors");

// Helper — get all dates in a range [checkIn, checkOut)
const getDateRange = (checkIn, checkOut) => {
  const dates = [];
  const current = new Date(checkIn);
  const end = new Date(checkOut);
  while (current < end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

// ── GET /api/rooms?hotelId=&checkIn=&checkOut= ───────────────────
exports.getRoomsByHotel = catchAsync(async (req, res, next) => {
  const { hotelId, checkIn, checkOut } = req.query;
  if (!hotelId) return next(new AppError("hotelId query param is required.", 400));

  const rooms = await Room.find({ hotelId, isActive: true }).lean();

  // If dates provided, annotate each room with availability
  if (checkIn && checkOut) {
    const requestedDates = getDateRange(checkIn, checkOut);
    for (const room of rooms) {
      room.roomNumbers = room.roomNumbers.map((rn) => {
        const bookedSet = new Set(rn.bookedDates.map((d) => new Date(d).toDateString()));
        const isAvailable = requestedDates.every((d) => !bookedSet.has(d.toDateString()));
        return { ...rn, isAvailable };
      });
      room.hasAvailableRooms = room.roomNumbers.some((rn) => rn.isAvailable);
    }
  }

  res.json({ success: true, data: rooms });
});

// ── GET /api/rooms/:id ────────────────────────────────────────────
exports.getRoomById = catchAsync(async (req, res, next) => {
  const room = await Room.findById(req.params.id).populate("hotelId", "name city").lean();
  if (!room) return next(new AppError("Room not found.", 404));
  res.json({ success: true, data: room });
});

// ── POST /api/rooms (admin) ───────────────────────────────────────
exports.createRoom = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMsg = errors.array()[0].msg || "Validation failed.";
    return res.status(400).json({ success: false, message: errorMsg, errors: errors.array() });
  }

  const { hotelId } = req.body;
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) return next(new AppError("Hotel not found.", 404));

  const room = await Room.create(req.body);

  // Update hotel's cheapest price if this room is cheaper
  if (room.price < hotel.cheapestPrice) {
    await Hotel.findByIdAndUpdate(hotelId, { cheapestPrice: room.price });
  }

  res.status(201).json({ success: true, data: room });
});

// ── PUT /api/rooms/:id (admin) ────────────────────────────────────
exports.updateRoom = catchAsync(async (req, res, next) => {
  const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!room) return next(new AppError("Room not found.", 404));
  res.json({ success: true, data: room });
});

// ── DELETE /api/rooms/:id (admin) ────────────────────────────────
exports.deleteRoom = catchAsync(async (req, res, next) => {
  const room = await Room.findByIdAndUpdate(req.params.id, { isActive: false });
  if (!room) return next(new AppError("Room not found.", 404));
  res.json({ success: true, message: "Room deactivated." });
});

// ── GET /api/rooms/:id/availability ──────────────────────────────
exports.checkAvailability = catchAsync(async (req, res, next) => {
  const { checkIn, checkOut } = req.query;
  if (!checkIn || !checkOut) return next(new AppError("checkIn and checkOut query params required.", 400));

  const room = await Room.findById(req.params.id).lean();
  if (!room) return next(new AppError("Room not found.", 404));

  const requestedDates = getDateRange(checkIn, checkOut);
  const availability = room.roomNumbers.map((rn) => {
    const bookedSet = new Set(rn.bookedDates.map((d) => new Date(d).toDateString()));
    const isAvailable = requestedDates.every((d) => !bookedSet.has(d.toDateString()));
    return { roomNumber: rn.number, isAvailable };
  });

  res.json({ success: true, data: { roomId: room._id, availability, hasAvailability: availability.some((a) => a.isAvailable) } });
});
