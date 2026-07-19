// routes/auth.js
const express = require("express");
const { body }  = require("express-validator");
const ctrl      = require("../controllers/authController");
const { verifyToken } = require("../middleware/auth");
const { validateBody } = require('../middleware/validate');
const Joi = require('joi');

const router = express.Router();

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(60).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

router.post("/register", validateBody(registerSchema), ctrl.register);
router.post("/login",    validateBody(loginSchema),    ctrl.login);
router.post("/refresh",                 ctrl.refreshToken);
router.post("/logout",   verifyToken,   ctrl.logout);
router.get( "/me",       verifyToken,   ctrl.getMe);

module.exports = router;
