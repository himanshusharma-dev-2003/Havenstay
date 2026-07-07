const bcrypt        = require("bcryptjs");
const jwt           = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const User          = require("../models/User");
const { AppError, catchAsync } = require("../utils/errors");

// ── Cookie options ────────────────────────────────────────────────
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 15 * 60 * 1000, // 15 minutes
};

// ── Register ──────────────────────────────────────────────────────
exports.register = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMsg = errors.array()[0].msg || "Validation failed.";
    return res.status(400).json({ success: false, message: errorMsg, errors: errors.array() });
  }

  const { name, email, password } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return next(new AppError("An account with this email already exists.", 409));
  }

  const user = await User.create({ name, email, password });

  const accessToken  = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Store hashed refresh token
  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  res.cookie("accessToken", accessToken, ACCESS_COOKIE_OPTIONS);
  res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

  res.status(201).json({
    success: true,
    message: "Account created successfully.",
    accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// ── Login ─────────────────────────────────────────────────────────
exports.login = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMsg = errors.array()[0].msg || "Validation failed.";
    return res.status(400).json({ success: false, message: errorMsg, errors: errors.array() });
  }

  const { email, password } = req.body;

  // Explicitly select password field (excluded by default)
  const user = await User.findOne({ email: email.toLowerCase(), isActive: true }).select("+password +refreshTokenHash");

  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError("Invalid email or password.", 401));
  }

  const accessToken  = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  res.cookie("accessToken", accessToken, ACCESS_COOKIE_OPTIONS);
  res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

  res.json({
    success: true,
    message: "Logged in successfully.",
    accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// ── Refresh access token ──────────────────────────────────────────
exports.refreshToken = catchAsync(async (req, res, next) => {
  const token = req.cookies?.refreshToken;
  if (!token) return next(new AppError("No refresh token provided.", 401));

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    return next(new AppError("Invalid or expired refresh token.", 401));
  }

  const user = await User.findById(decoded.id).select("+refreshTokenHash");
  if (!user) return next(new AppError("User not found.", 401));

  const isValid = await bcrypt.compare(token, user.refreshTokenHash || "");
  if (!isValid) return next(new AppError("Refresh token revoked.", 401));

  const newAccessToken  = user.generateAccessToken();
  const newRefreshToken = user.generateRefreshToken();

  user.refreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
  await user.save({ validateBeforeSave: false });

  res.cookie("accessToken", newAccessToken, ACCESS_COOKIE_OPTIONS);
  res.cookie("refreshToken", newRefreshToken, REFRESH_COOKIE_OPTIONS);

  res.json({ success: true, accessToken: newAccessToken });
});

// ── Logout ────────────────────────────────────────────────────────
exports.logout = catchAsync(async (req, res) => {
  if (req.user?.id) {
    await User.findByIdAndUpdate(req.user.id, { refreshTokenHash: null });
  }
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  res.json({ success: true, message: "Logged out successfully." });
});

// ── Get current user ──────────────────────────────────────────────
exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError("User not found.", 404));
  res.json({ success: true, user });
});
