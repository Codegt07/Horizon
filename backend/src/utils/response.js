/**
 * Send a successful JSON response.
 *
 * @param {import("express").Response} res
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Human-readable message
 * @param {*} [data] - Optional payload
 */
function sendSuccess(res, statusCode, message, data) {
  const body = { success: true, message };
  if (data !== undefined) body.data = data;
  return res.status(statusCode).json(body);
}

/**
 * Send an error JSON response.
 *
 * @param {import("express").Response} res
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Human-readable message
 * @param {*} [errors] - Optional validation errors or details
 */
function sendError(res, statusCode, message, errors) {
  const body = { success: false, message };
  if (errors !== undefined) body.errors = errors;
  return res.status(statusCode).json(body);
}

module.exports = { sendSuccess, sendError };
