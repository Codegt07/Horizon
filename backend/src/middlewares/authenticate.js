const { verifyToken } = require("../utils/token");
const { sendError } = require("../utils/response");

/**
 * Authenticate middleware — verifies the JWT from the httpOnly cookie.
 * On success, attaches the decoded payload to req.user and calls next().
 * On failure, responds with 401 immediately.
 */
function authenticate(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return sendError(res, 401, "Authentication required");
  }

  try {
    const payload = verifyToken(token);

    // Block incomplete profiles from all routes except /complete-profile (Phase 3)
    if (payload.isProfileComplete === false) {
      return sendError(res, 403, "Please complete your profile before continuing");
    }

    req.user = payload;
    next();
  } catch (err) {
    // JsonWebTokenError and TokenExpiredError both result in a 401
    return sendError(res, 401, "Invalid or expired token");
  }
}

module.exports = { authenticate };
