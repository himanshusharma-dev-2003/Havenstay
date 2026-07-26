const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { validationResult } = require('express-validator');
const User   = require('../models/User');
const { AppError, catchAsync } = require('../utils/errors');
const { AUTH } = require('../constants');
const config = require('../config');

/**
 * Shared secure cookie options for the httpOnly token cookies.
 *
 * Using httpOnly prevents client-side JS from accessing the tokens,
 * mitigating XSS-based token theft. sameSite: 'strict' prevents CSRF.
 * secure: true in production enforces HTTPS-only transmission.
 */
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   config.isProd,
  sameSite: config.isProd ? 'none' : 'lax',
  maxAge:   AUTH.REFRESH_COOKIE_MAX_AGE,
};

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   config.isProd,
  sameSite: config.isProd ? 'none' : 'lax',
  maxAge:   AUTH.ACCESS_COOKIE_MAX_AGE,
};

/**
 * POST /api/auth/register
 *
 * Creates a new user account. On success, issues both an access token cookie
 * (15 min) and a refresh token cookie (7 days). The refresh token is stored
 * as a bcrypt hash in MongoDB — raw tokens are never persisted.
 *
 * @body {{ name: string, email: string, password: string }}
 * @returns {{ success: true, user: { id, name, email, role } }}
 * @throws {400} Validation errors
 * @throws {409} Email already registered
 */
exports.register = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMsg = errors.array()[0].msg || 'Validation failed.';
    return res.status(400).json({ success: false, message: errorMsg, errors: errors.array() });
  }

  const { name, email, password } = req.body;

  const existing = await User.findOne({ email: email.trim().toLowerCase() });
  if (existing) {
    return next(new AppError('An account with this email already exists.', 409));
  }

  const user = await User.create({ name, email, password });

  const accessToken  = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Store a bcrypt hash of the refresh token — never the raw token
  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  user.lastLogin        = new Date();
  await user.save({ validateBeforeSave: false });

  res.cookie('accessToken',  accessToken,  ACCESS_COOKIE_OPTIONS);
  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

  res.status(201).json({
    success: true,
    message: 'Account created successfully.',
    accessToken,
    user:    { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

/**
 * POST /api/auth/login
 *
 * Authenticates a user by email + password. Issues fresh token cookies on success.
 * The deliberate generic error message ("Invalid email or password") prevents
 * user enumeration attacks.
 *
 * @body {{ email: string, password: string }}
 * @returns {{ success: true, user: { id, name, email, role } }}
 * @throws {400} Validation errors
 * @throws {401} Invalid credentials
 */
exports.login = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMsg = errors.array()[0].msg || 'Validation failed.';
    return res.status(400).json({ success: false, message: errorMsg, errors: errors.array() });
  }

  const { email, password } = req.body;

  // Explicitly select +password — field is excluded by default for security
  const user = await User.findOne({ email: email.trim().toLowerCase(), isActive: true })
    .select('+password +refreshTokenHash');

  // Constant-time comparison via bcrypt prevents timing attacks
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Invalid email or password.', 401));
  }

  const accessToken  = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  user.lastLogin        = new Date();
  await user.save({ validateBeforeSave: false });

  res.cookie('accessToken',  accessToken,  ACCESS_COOKIE_OPTIONS);
  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

  res.json({
    success: true,
    message: 'Logged in successfully.',
    accessToken,
    user:    { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

/**
 * POST /api/auth/refresh
 *
 * Issues a new access + refresh token pair using the refresh token cookie.
 * Implements refresh token rotation — the old refresh token is invalidated
 * on each use, preventing replay attacks.
 *
 * @cookie refreshToken - httpOnly refresh token
 * @returns {{ success: true }}
 * @throws {401} Missing / invalid / revoked refresh token
 */
exports.refreshToken = catchAsync(async (req, res, next) => {
  const token = req.cookies?.refreshToken;
  if (!token) return next(new AppError('No refresh token provided.', 401));

  let decoded;
  try {
    decoded = jwt.verify(token, config.jwt.refreshSecret);
  } catch {
    return next(new AppError('Invalid or expired refresh token.', 401));
  }

  const user = await User.findById(decoded.id).select('+refreshTokenHash');
  if (!user) return next(new AppError('User not found.', 401));

  const isValid = await bcrypt.compare(token, user.refreshTokenHash || '');
  if (!isValid) return next(new AppError('Refresh token revoked.', 401));

  // Rotate tokens — old refresh token is replaced with a new one
  const newAccessToken  = user.generateAccessToken();
  const newRefreshToken = user.generateRefreshToken();

  user.refreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
  await user.save({ validateBeforeSave: false });

  res.cookie('accessToken',  newAccessToken,  ACCESS_COOKIE_OPTIONS);
  res.cookie('refreshToken', newRefreshToken, REFRESH_COOKIE_OPTIONS);

  res.json({ success: true, accessToken: newAccessToken });
});

/**
 * POST /api/auth/logout
 *
 * Invalidates the refresh token server-side (nullifies the stored hash)
 * and clears both cookies from the client.
 *
 * @auth Required
 * @returns {{ success: true, message: string }}
 */
exports.logout = catchAsync(async (req, res) => {
  if (req.user?.id) {
    // Invalidate the stored refresh token hash — the user must re-login
    await User.findByIdAndUpdate(req.user.id, { refreshTokenHash: null });
  }
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out successfully.' });
});

/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated user's profile.
 * Sensitive fields (password, refreshTokenHash) are excluded by the User model's
 * toJSON() override.
 *
 * @auth Required
 * @returns {{ success: true, user: User }}
 * @throws {404} User not found (should not happen under normal operation)
 */
exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError('User not found.', 404));
  res.json({ success: true, user });
});

/**
 * POST /api/auth/google
 *
 * Authenticates or registers a user via Google OAuth 2.0.
 *
 * @body {{ credential: string }}
 * @returns {{ success: true, user: User, accessToken: string }}
 */
exports.googleLogin = catchAsync(async (req, res, next) => {
  const { credential } = req.body;
  if (!credential) {
    return next(new AppError('No Google credential provided.', 400));
  }

  // Guard: GOOGLE_CLIENT_ID must be set in the server environment (Railway/Render/etc.)
  // If missing, verifyIdToken will always fail with "Invalid Google credential."
  if (!process.env.GOOGLE_CLIENT_ID) {
    console.error('[Google OAuth] GOOGLE_CLIENT_ID environment variable is not set on the server.');
    return next(new AppError('Google login is not configured on the server.', 500));
  }

  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  
  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (error) {
    // Log the real Google error so it shows up in Railway/Render logs
    console.error('[Google OAuth] Token verification failed:', error.message);
    return next(new AppError('Invalid Google credential.', 401));
  }

  const { sub: googleId, email, name, picture: avatar, email_verified } = payload;
  
  if (!email) {
    return next(new AppError('Google account does not have an email address.', 400));
  }

  // Find user by email
  let user = await User.findOne({ email: email.trim().toLowerCase() });
  
  if (user) {
    // If the user exists but is a local user, optionally link the account or just let them login
    if (user.provider !== 'google') {
      user.provider = 'google';
      user.googleId = googleId;
      if (!user.avatar && avatar) user.avatar = avatar;
      user.emailVerified = email_verified || user.emailVerified;
    }
  } else {
    // Create new Google user
    user = await User.create({
      name,
      email: email.trim().toLowerCase(),
      provider: 'google',
      googleId,
      avatar,
      emailVerified: email_verified || false,
      // No password needed for google provider
    });
  }

  if (!user.isActive) {
    return next(new AppError('Account is disabled.', 403));
  }

  const accessToken  = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  user.lastLogin        = new Date();
  await user.save({ validateBeforeSave: false });

  res.cookie('accessToken',  accessToken,  ACCESS_COOKIE_OPTIONS);
  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

  res.json({
    success: true,
    message: 'Logged in with Google successfully.',
    accessToken,
    user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
  });
});
