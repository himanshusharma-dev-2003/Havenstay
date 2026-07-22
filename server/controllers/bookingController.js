const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const Booking  = require('../models/Booking');
const Room     = require('../models/Room');
const Hotel    = require('../models/Hotel');
const { AppError, catchAsync } = require('../utils/errors');
const { TAX_RATE, BOOKING_STATUS, PAGINATION } = require('../constants');
const config   = require('../config');
const cache    = require('../services/cache.service');
const Razorpay = require('razorpay');
const crypto   = require('crypto');

/**
 * Generates an array of Date objects representing each night of a stay.
 * Used to mark specific room-number dates as booked in MongoDB.
 *
 * @param {string|Date} checkIn  - Start date (inclusive)
 * @param {string|Date} checkOut - End date (exclusive — last night is checkOut-1)
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
 * POST /api/bookings
 *
 * Creates a booking in a concurrency-safe manner using MongoDB's atomic
 * findOneAndUpdate with $nin (not-in) conflict detection.
 *
 * Flow:
 *   1. Validate input + date range
 *   2. Find the room and confirm guest count fits
 *   3. Identify an available room number (not already booked on requested dates)
 *   4. Atomically claim the dates using $addToSet + $nin — prevents race conditions
 *      without needing distributed locks (two concurrent requests get exactly
 *      one success and one 409)
 *   5. Calculate price with tax
 *   6. Create the Booking document
 *   7. Initialise a Razorpay order and return order details to the client
 *
 * @auth Required
 * @body {{ roomId, hotelId, checkIn, checkOut, guests, roomNumber? }}
 * @returns {{ success: true, data: Booking & { razorpayOrderId, amount, currency } }}
 * @throws {400} Validation / date / guest-count errors
 * @throws {404} Room or hotel not found
 * @throws {409} No availability / race condition conflict
 * @throws {500} Payment gateway not configured
 */
exports.createBooking = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { roomId, hotelId, checkIn, checkOut, guests, roomNumber: requestedRoomNumber } = req.body;

  const checkInDate  = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  if (checkOutDate <= checkInDate) {
    return next(new AppError('Check-out must be after check-in.', 400));
  }
  if (checkInDate < new Date()) {
    return next(new AppError('Check-in date cannot be in the past.', 400));
  }

  const nights         = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
  const requestedDates = getDateRange(checkIn, checkOut);

  // ── Step 1: Verify room + hotel exist ────────────────────────────
  const room = await Room.findOne({ _id: roomId, isActive: true });
  if (!room) return next(new AppError('Room not found or unavailable.', 404));

  const hotel = await Hotel.findById(hotelId);
  if (!hotel) return next(new AppError('Hotel not found.', 404));

  if (guests > room.maxPeople) {
    return next(new AppError(`This room accommodates a maximum of ${room.maxPeople} guests.`, 400));
  }

  // ── Step 2: Find a free room number ──────────────────────────────
  let availableRoomNumber = null;
  for (const rn of room.roomNumbers) {
    const bookedSet = new Set(rn.bookedDates.map((d) => new Date(d).toDateString()));
    const hasConflict = requestedDates.some((d) => bookedSet.has(d.toDateString()));
    if (!hasConflict) {
      if (!requestedRoomNumber || rn.number === requestedRoomNumber) {
        availableRoomNumber = rn.number;
        break;
      }
    }
  }

  if (!availableRoomNumber) {
    return next(new AppError('No availability for the selected dates. Please choose different dates.', 409));
  }

  // ── Step 3: Atomically claim the dates ───────────────────────────
  //
  // Critical section: findOneAndUpdate with $nin ensures that if two concurrent
  // requests both passed the availability check above, only one will succeed here.
  // The $nin condition fails for the second request, returning null → 409.
  //
  const updated = await Room.findOneAndUpdate(
    {
      _id: roomId,
      'roomNumbers.number': availableRoomNumber,
      'roomNumbers.bookedDates': { $nin: requestedDates }, // atomic conflict guard
    },
    {
      $addToSet: {
        'roomNumbers.$.bookedDates': { $each: requestedDates },
      },
    },
    { new: true },
  );

  if (!updated) {
    return next(new AppError('Booking conflict: those dates were just taken. Please try again.', 409));
  }

  // ── Step 3b: Invalidate availability cache ────────────────────────
  // Dates have been atomically claimed — any cached availability check
  // for this room must be cleared immediately so other users see the
  // updated availability on their next request.
  await cache.delPattern(`availability:${roomId}:*`);

  // ── Step 4: Calculate price ───────────────────────────────────────
  const subtotal   = room.price * nights;
  const totalPrice = Math.round(subtotal * (1 + TAX_RATE)); // TAX_RATE from constants

  // ── Step 5: Create booking record ─────────────────────────────────
  const booking = await Booking.create({
    userId:        req.user.id,
    hotelId,
    roomId,
    roomNumber:    availableRoomNumber,
    checkIn:       checkInDate,
    checkOut:      checkOutDate,
    guests:        Number(guests),
    nights,
    pricePerNight: room.price,
    totalPrice,
    status:        BOOKING_STATUS.PENDING,
  });

  // ── Step 6: Initialise Razorpay order ─────────────────────────────
  if (!config.razorpay.isEnabled) {
    // Roll back the booking if the payment gateway is unavailable
    await booking.deleteOne();
    return next(new AppError('Payment gateway is not configured.', 500));
  }

  const razorpay = new Razorpay({
    key_id:     config.razorpay.keyId,
    key_secret: config.razorpay.keySecret,
  });

  const order = await razorpay.orders.create({
    amount:   totalPrice * 100, // Razorpay expects amount in paise (1 INR = 100 paise)
    currency: 'INR',
    receipt:  booking._id.toString(),
  });

  booking.razorpayOrderId = order.id;
  await booking.save();

  await booking.populate([
    { path: 'hotelId', select: 'name city photos' },
    { path: 'roomId',  select: 'title price' },
  ]);

  res.status(201).json({
    success: true,
    message: 'Booking initialised. Complete payment to confirm.',
    data: {
      ...booking.toObject(),
      razorpayOrderId: order.id,
      amount:          order.amount,
      currency:        order.currency,
    },
  });
});

/**
 * GET /api/bookings/my
 *
 * Returns the authenticated user's booking history, sorted by most recent first.
 * Supports pagination and optional status filter.
 *
 * @auth Required
 * @query {string} [status] - Filter by booking status
 * @query {number} [page=1]
 * @query {number} [limit=10]
 * @returns {{ success: true, total: number, page: number, pages: number, data: Booking[] }}
 */
exports.getMyBookings = catchAsync(async (req, res) => {
  const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_BOOKING_LIMIT, status } = req.query;

  const filter = { userId: req.user.id };
  if (status) filter.status = status;

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('hotelId', 'name city photos')
      .populate('roomId',  'title price photos'),
    Booking.countDocuments(filter),
  ]);

  res.json({
    success: true,
    total,
    page:  Number(page),
    pages: Math.ceil(total / Number(limit)),
    data:  bookings,
  });
});

/**
 * GET /api/bookings  [Admin]
 *
 * Returns all bookings with pagination. Includes an aggregated revenue summary
 * for confirmed and completed bookings (admin dashboard use-case).
 *
 * @auth Admin
 * @query {string} [status]  - Filter by status
 * @query {string} [hotelId] - Filter by hotel
 * @query {number} [page=1]
 * @query {number} [limit=20]
 * @returns {{ success: true, total: number, revenue: number, data: Booking[] }}
 */
exports.getAllBookings = catchAsync(async (req, res) => {
  const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.ADMIN_BOOKING_LIMIT, status, hotelId } = req.query;

  const filter = {};
  if (status)  filter.status  = status;
  if (hotelId) filter.hotelId = hotelId;

  // Run paginated query and revenue aggregation in parallel for performance
  const [bookings, total, revenueAgg] = await Promise.all([
    Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('userId',  'name email')
      .populate('hotelId', 'name city')
      .populate('roomId',  'title price'),
    Booking.countDocuments(filter),
    Booking.aggregate([
      { $match: { status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.COMPLETED] } } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' }, count: { $sum: 1 } } },
    ]),
  ]);

  const revenue = revenueAgg[0] || { totalRevenue: 0, count: 0 };

  res.json({
    success: true,
    total,
    page:    Number(page),
    pages:   Math.ceil(total / Number(limit)),
    revenue: revenue.totalRevenue,
    data:    bookings,
  });
});

/**
 * GET /api/bookings/:id
 *
 * Returns a single booking. Users can only retrieve their own bookings;
 * admins can access any booking.
 *
 * @auth Required
 * @param {string} id - MongoDB ObjectId
 * @returns {{ success: true, data: Booking }}
 * @throws {403} Not authorised
 * @throws {404} Booking not found
 */
exports.getBookingById = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)
    .populate('userId',  'name email')
    .populate('hotelId', 'name city address photos')
    .populate('roomId',  'title price amenities photos');

  if (!booking) return next(new AppError('Booking not found.', 404));

  // Ownership check — users may only see their own bookings
  if (req.user.role !== 'admin' && booking.userId._id.toString() !== req.user.id) {
    return next(new AppError('You are not authorised to view this booking.', 403));
  }

  res.json({ success: true, data: booking });
});

/**
 * PATCH /api/bookings/:id/cancel
 *
 * Cancels a booking and atomically releases the booked dates back to the room,
 * making them immediately available for new reservations.
 *
 * @auth Required (user owns booking, or admin)
 * @param {string} id - MongoDB ObjectId
 * @body {{ reason?: string }}
 * @returns {{ success: true, message: string, data: Booking }}
 * @throws {400} Already cancelled or completed
 * @throws {403} Not authorised
 * @throws {404} Booking not found
 */
exports.cancelBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return next(new AppError('Booking not found.', 404));

  if (req.user.role !== 'admin' && booking.userId.toString() !== req.user.id) {
    return next(new AppError('Not authorised.', 403));
  }

  if (booking.status === BOOKING_STATUS.CANCELLED) {
    return next(new AppError('Booking is already cancelled.', 400));
  }
  if (booking.status === BOOKING_STATUS.COMPLETED) {
    return next(new AppError('Cannot cancel a completed booking.', 400));
  }

  // Release the dates atomically — the room is immediately re-bookable
  const bookedDates = getDateRange(booking.checkIn, booking.checkOut);
  await Room.findOneAndUpdate(
    { _id: booking.roomId, 'roomNumbers.number': booking.roomNumber },
    { $pullAll: { 'roomNumbers.$.bookedDates': bookedDates } },
  );

  booking.status             = BOOKING_STATUS.CANCELLED;
  booking.cancellationReason = req.body.reason || 'Cancelled by user';
  booking.cancelledAt        = new Date();
  await booking.save();

  // Invalidate availability cache — dates are now free again, so any cached
  // "unavailable" response for this room must be cleared immediately.
  await cache.delPattern(`availability:${booking.roomId}:*`);

  res.json({ success: true, message: 'Booking cancelled and dates released.', data: booking });
});

/**
 * POST /api/bookings/:id/verify-payment
 *
 * Verifies a Razorpay payment signature using HMAC-SHA256.
 * The signature is computed server-side and compared against the one
 * received from Razorpay to ensure the payment was not tampered with.
 *
 * @auth Required
 * @param {string} id - Booking MongoDB ObjectId
 * @body {{ razorpay_order_id, razorpay_payment_id, razorpay_signature }}
 * @returns {{ success: true, message: string }}
 * @throws {400} Signature mismatch / invalid order ID
 * @throws {404} Booking not found
 */
exports.verifyPayment = catchAsync(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  // Reconstruct the expected signature: HMAC-SHA256(orderId|paymentId, keySecret)
  const body              = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return next(new AppError('Payment verification failed. Signature mismatch.', 400));
  }

  const booking = await Booking.findById(req.params.id);
  if (!booking) return next(new AppError('Booking not found.', 404));

  if (booking.razorpayOrderId !== razorpay_order_id) {
    return next(new AppError('Order ID does not match this booking.', 400));
  }

  booking.razorpayPaymentId = razorpay_payment_id;
  booking.razorpaySignature = razorpay_signature;
  booking.status            = BOOKING_STATUS.CONFIRMED;
  await booking.save();

  res.json({ success: true, message: 'Payment verified. Booking confirmed.' });
});
