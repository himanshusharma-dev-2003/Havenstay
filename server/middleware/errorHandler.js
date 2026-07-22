const { logger } = require('../logger');

/**
 * Global Express error handler.
 *
 * Extracted from server.js into its own middleware module for
 * separation of concerns and testability.
 *
 * Handles both operational errors (AppError instances with isOperational=true)
 * and unexpected programming errors. Operational errors expose their message
 * to the client; unexpected errors return a generic 500 to avoid leaking
 * implementation details.
 *
 * @param {Error} err
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  // Structured error logging — includes request context for tracing
  logger.error(
    { err, path: req.path, method: req.method, reqId: req.id },
    err.message || 'Unhandled error',
  );

  const statusCode = err.statusCode || 500;

  const payload = {
    success: false,
    // Only expose the real message for operational (expected) errors.
    // For bugs/crashes, return a generic message so stack traces don't leak.
    message: err.isOperational ? err.message : 'An unexpected error occurred. Please try again later.',
  };

  // Include stack trace in development for easier debugging
  if (process.env.NODE_ENV === 'development') {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
};

module.exports = errorHandler;
