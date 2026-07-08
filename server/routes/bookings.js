const express = require("express");
const { body } = require("express-validator");
const ctrl     = require("../controllers/bookingController");
const { verifyToken, verifyAdmin } = require("../middleware/auth");

const router = express.Router();

const bookingRules = [
  body("roomId").notEmpty().withMessage("roomId required"),
  body("hotelId").notEmpty().withMessage("hotelId required"),
  body("checkIn").isISO8601().withMessage("Valid check-in date required"),
  body("checkOut").isISO8601().withMessage("Valid check-out date required"),
  body("guests").isInt({ min: 1 }).withMessage("guests must be at least 1"),
];

// User routes
router.post("/",              verifyToken,              bookingRules, ctrl.createBooking);
router.post("/:id/verify-payment", verifyToken,                     ctrl.verifyPayment);
router.get( "/my",            verifyToken,                            ctrl.getMyBookings);
router.get( "/:id",           verifyToken,                            ctrl.getBookingById);
router.patch("/:id/cancel",   verifyToken,                            ctrl.cancelBooking);

// Admin routes
router.get( "/",              verifyToken, verifyAdmin,               ctrl.getAllBookings);

module.exports = router;
