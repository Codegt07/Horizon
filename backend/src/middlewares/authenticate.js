const { verifyToken } = require("../utils/token");
const { sendError } = require("../utils/response");

/**
 * Authenticate middleware — verifies the JWT from the httpOnly cookie.
 * On success, attaches the decoded payload to req.user and calls next().
 * On failure, responds with 401 immediately.
 *
 * Accepts only full-auth tokens (type === "auth").
 * Partial profile-completion tokens (type === "partial") are explicitly
 * rejected here; they are only valid on POST /api/auth/complete-profile.
 */
function authenticate(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return sendError(res, 401, "Authentication required");
  }

  try {
    const payload = verifyToken(token);

    // Reject partial tokens — they are not valid for protected routes
    if (payload.type !== "auth") {
      return sendError(res, 401, "Invalid token type");
    }

    // Block incomplete profiles (OAuth users who haven't submitted their role yet)
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
