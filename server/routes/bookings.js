const express = require("express");
const { body } = require("express-validator");
const ctrl     = require("../controllers/bookingController");
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const { validateBody } = require('../middleware/validate');
const Joi = require('joi');

const router = express.Router();

const bookingSchema = Joi.object({
  roomId: Joi.string().required(),
  hotelId: Joi.string().required(),
  checkIn: Joi.date().iso().required(),
  checkOut: Joi.date().iso().required(),
  guests: Joi.number().integer().min(1).required(),
  roomNumber: Joi.number().optional(),
});

// User routes
<<<<<<< HEAD
router.post("/",              verifyToken,              bookingRules, ctrl.createBooking);
router.post("/:id/verify-payment", verifyToken,                     ctrl.verifyPayment);
=======
router.post("/",              verifyToken, validateBody(bookingSchema), ctrl.createBooking);
>>>>>>> 123c77a (chore(prod): production hardening — logging, env validation, cookie-based auth, Joi validation, concurrency tests, CI, Docker)
router.get( "/my",            verifyToken,                            ctrl.getMyBookings);
router.get( "/:id",           verifyToken,                            ctrl.getBookingById);
router.patch("/:id/cancel",   verifyToken,                            ctrl.cancelBooking);

// Admin routes
router.get( "/",              verifyToken, verifyAdmin,               ctrl.getAllBookings);

module.exports = router;
