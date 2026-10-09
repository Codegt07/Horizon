const { env } = require("../config/env");
const { sendError } = require("../utils/response");

/**
 * Centralized error-handling middleware.
 * Must be registered as the last middleware in app.js.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return sendError(res, 400, "Validation failed", errors);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field =
      err.keyValue && Object.keys(err.keyValue).length > 0
        ? Object.keys(err.keyValue)[0]
        : "Field";
    return sendError(res, 409, `${field} already exists`);
  }

  // Mongoose cast error (invalid ObjectId, etc.)
  if (err.name === "CastError") {
    return sendError(res, 400, `Invalid value for field: ${err.path}`);
  }

  // JWT errors — primary handling is in the authenticate middleware;
  // this catches anything that bubbles up via next(err)
  if (err.name === "JsonWebTokenError") {
    return sendError(res, 401, "Invalid token");
  }
  if (err.name === "TokenExpiredError") {
    return sendError(res, 401, "Token expired");
  }

  // Operational errors with an explicit statusCode attached by controllers
  const statusCode = err.statusCode || 500;
  const message =
    statusCode === 500 && env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "Internal server error";

  if (statusCode === 500) {
    console.error("Unhandled error:", err);
  }

  return sendError(res, statusCode, message);
}

module.exports = { errorHandler };
