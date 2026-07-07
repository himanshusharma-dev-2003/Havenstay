// routes/auth.js
const express = require("express");
const { body }  = require("express-validator");
const ctrl      = require("../controllers/authController");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

const registerRules = [
  body("name").trim().notEmpty().isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

const loginRules = [
  body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

router.post("/register", registerRules, ctrl.register);
router.post("/login",    loginRules,    ctrl.login);
router.post("/refresh",                 ctrl.refreshToken);
router.post("/logout",   verifyToken,   ctrl.logout);
router.get( "/me",       verifyToken,   ctrl.getMe);

module.exports = router;
