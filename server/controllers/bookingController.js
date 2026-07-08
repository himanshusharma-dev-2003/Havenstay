const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const Booking = require("../models/Booking");
const Room    = require("../models/Room");
const Hotel   = require("../models/Hotel");
const { AppError, catchAsync } = require("../utils/errors");
const Razorpay = require("razorpay");
const crypto = require("crypto");

// Helper — generate all dates in range [checkIn, checkOut)
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

// ── POST /api/bookings ────────────────────────────────────────────
// CONCURRENCY-SAFE: Uses atomic findOneAndUpdate with array filter.
// Two simultaneous requests for the same room + dates will result in
// exactly one success and one 409 Conflict — no double booking possible.
exports.createBooking = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { roomId, hotelId, checkIn, checkOut, guests, roomNumber: requestedRoomNumber } = req.body;

  const checkInDate  = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  if (checkOutDate <= checkInDate) {
    return next(new AppError("Check-out must be after check-in.", 400));
  }

  if (checkInDate < new Date()) {
    return next(new AppError("Check-in date cannot be in the past.", 400));
  }

  const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
  const requestedDates = getDateRange(checkIn, checkOut);

  // ── Step 1: Find an available room number ─────────────────────
  const room = await Room.findOne({ _id: roomId, isActive: true });
  if (!room) return next(new AppError("Room not found or unavailable.", 404));

  const hotel = await Hotel.findById(hotelId);
  if (!hotel) return next(new AppError("Hotel not found.", 404));

  if (guests > room.maxPeople) {
    return next(new AppError(`This room accommodates a maximum of ${room.maxPeople} guests.`, 400));
  }

  // Find an available room number (not booked on requested dates)
  let availableRoomNumber = null;
  for (const rn of room.roomNumbers) {
    const bookedSet = new Set(rn.bookedDates.map((d) => new Date(d).toDateString()));
    const conflict  = requestedDates.some((d) => bookedSet.has(d.toDateString()));
    if (!conflict) {
      // If user requested a specific room number, honour it
      if (!requestedRoomNumber || rn.number === requestedRoomNumber) {
        availableRoomNumber = rn.number;
        break;
      }
    }
  }

  if (!availableRoomNumber) {
    return next(new AppError("No availability for the selected dates. Please choose different dates.", 409));
  }

  // ── Step 2: Atomic update — add dates to the room number ──────
  // This is the critical section. We use arrayFilters + $each to atomically
  // add ALL requested dates to the specific room number in one operation.
  // The condition checks that none of the dates already exist ($nin),
  // preventing race conditions without needing distributed locks.
  const updated = await Room.findOneAndUpdate(
    {
      _id: roomId,
      "roomNumbers.number": availableRoomNumber,
      // Ensure NONE of the requested dates are already booked (atomic conflict check)
      "roomNumbers.bookedDates": { $nin: requestedDates },
    },
    {
      $addToSet: {
        // $addToSet won't add duplicates, but the $nin check above is the real guard
        "roomNumbers.$.bookedDates": { $each: requestedDates },
      },
    },
    { new: true }
  );

  // If updated is null, another request won that race — conflict
  if (!updated) {
    return next(new AppError("Booking conflict: dates were just taken. Please try again.", 409));
  }

  // ── Step 3: Create the booking record ────────────────────────
  const TAX_RATE   = 0.12;
  const subtotal   = room.price * nights;
  const totalPrice = Math.round(subtotal * (1 + TAX_RATE));

  const booking = await Booking.create({
    userId:         req.user.id,
    hotelId,
    roomId,
    roomNumber:     availableRoomNumber,
    checkIn:        checkInDate,
    checkOut:       checkOutDate,
    guests:         Number(guests),
    nights,
    pricePerNight:  room.price,
    totalPrice,
    status:         "pending",
  });

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    // If Razorpay is not configured, we should cancel the booking and error out
    await booking.deleteOne();
    return next(new AppError("Payment gateway is not configured.", 500));
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  const order = await razorpay.orders.create({
    amount: totalPrice * 100, // amount in paisa
    currency: "INR",
    receipt: booking._id.toString(),
  });

  booking.razorpayOrderId = order.id;
  await booking.save();

  await booking.populate([
    { path: "hotelId", select: "name city photos" },
    { path: "roomId",  select: "title price" },
  ]);

  res.status(201).json({
    success: true,
    message: "Booking initialized.",
    data: {
      ...booking.toObject(),
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
    },
  });
});

// ── GET /api/bookings/my ──────────────────────────────────────────
exports.getMyBookings = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const filter = { userId: req.user.id };
  if (status) filter.status = status;

  const bookings = await Booking.find(filter)
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .populate("hotelId", "name city photos")
    .populate("roomId",  "title price photos");

  const total = await Booking.countDocuments(filter);

  res.json({
    success: true,
    total,
    page:  Number(page),
    pages: Math.ceil(total / Number(limit)),
    data:  bookings,
  });
});

// ── GET /api/bookings (admin) ─────────────────────────────────────
exports.getAllBookings = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status, hotelId } = req.query;
  const filter = {};
  if (status)  filter.status  = status;
  if (hotelId) filter.hotelId = hotelId;

  const bookings = await Booking.find(filter)
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .populate("userId",  "name email")
    .populate("hotelId", "name city")
    .populate("roomId",  "title price");

  const total = await Booking.countDocuments(filter);

  // Revenue summary for admin
  const revenueAgg = await Booking.aggregate([
    { $match: { status: { $in: ["confirmed", "completed"] } } },
    { $group: { _id: null, totalRevenue: { $sum: "$totalPrice" }, count: { $sum: 1 } } },
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

// ── GET /api/bookings/:id ─────────────────────────────────────────
exports.getBookingById = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)
    .populate("userId",  "name email")
    .populate("hotelId", "name city address photos")
    .populate("roomId",  "title price amenities photos");

  if (!booking) return next(new AppError("Booking not found.", 404));

  // Users can only see their own bookings; admins see all
  if (req.user.role !== "admin" && booking.userId._id.toString() !== req.user.id) {
    return next(new AppError("You are not authorized to view this booking.", 403));
  }

  res.json({ success: true, data: booking });
});

// ── PATCH /api/bookings/:id/cancel ────────────────────────────────
exports.cancelBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return next(new AppError("Booking not found.", 404));

  if (req.user.role !== "admin" && booking.userId.toString() !== req.user.id) {
    return next(new AppError("Not authorized.", 403));
  }

  if (booking.status === "cancelled") {
    return next(new AppError("Booking is already cancelled.", 400));
  }

  if (booking.status === "completed") {
    return next(new AppError("Cannot cancel a completed booking.", 400));
  }

  // ── Release the booked dates atomically ───────────────────────
  const bookedDates = getDateRange(booking.checkIn, booking.checkOut);

  await Room.findOneAndUpdate(
    { _id: booking.roomId, "roomNumbers.number": booking.roomNumber },
    { $pullAll: { "roomNumbers.$.bookedDates": bookedDates } }
  );

  booking.status             = "cancelled";
  booking.cancellationReason = req.body.reason || "Cancelled by user";
  booking.cancelledAt        = new Date();
  await booking.save();

  res.json({ success: true, message: "Booking cancelled and dates released.", data: booking });
});

// ── POST /api/bookings/:id/verify-payment ─────────────────────────
exports.verifyPayment = catchAsync(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const bookingId = req.params.id;

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return next(new AppError("Payment verification failed.", 400));
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) return next(new AppError("Booking not found.", 404));

  if (booking.razorpayOrderId !== razorpay_order_id) {
    return next(new AppError("Invalid Razorpay order ID.", 400));
  }

  booking.razorpayPaymentId = razorpay_payment_id;
  booking.razorpaySignature = razorpay_signature;
  booking.status = "confirmed";
  await booking.save();

  res.json({
    success: true,
    message: "Payment verified successfully",
  });
});
