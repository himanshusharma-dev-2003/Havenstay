const express = require("express");
const { body } = require("express-validator");
const ctrl     = require("../controllers/hotelController");
const { verifyToken, verifyAdmin, verifyOwnerOrAdmin, optionalAuth } = require("../middleware/auth");

const router = express.Router();

const hotelRules = [
  body("name").trim().notEmpty().withMessage("Hotel name required"),
  body("city").trim().notEmpty().withMessage("City required"),
  body("country").trim().notEmpty().withMessage("Country required"),
  body("address").trim().notEmpty().withMessage("Address required"),
  body("description").trim().notEmpty().withMessage("Description required"),
  body("cheapestPrice").isNumeric().withMessage("Price must be a number"),
];

// Public
router.get("/",    optionalAuth, ctrl.getAllHotels);
router.get("/:id", ctrl.getHotelById);

// Admin or Owner
router.post(  "/",    verifyToken, verifyOwnerOrAdmin, hotelRules, ctrl.createHotel);
router.put(   "/:id", verifyToken, verifyOwnerOrAdmin,             ctrl.updateHotel);
router.delete("/:id", verifyToken, verifyOwnerOrAdmin,             ctrl.deleteHotel);

module.exports = router;
