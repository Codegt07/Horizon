const { sendError } = require("../utils/response");

/**
 * Role-based authorization middleware factory.
 * Must be used after the `authenticate` middleware.
 *
 * Usage:
 *   router.post("/opportunities", authenticate, requireRole("fundraiser"), handler)
 *   router.post("/investments",   authenticate, requireRole("investor"),   handler)
 *
 * @param {...string} roles - Allowed roles
 * @returns {import("express").RequestHandler}
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      // Shouldn't happen if authenticate runs first, but guard anyway
      return sendError(res, 401, "Authentication required");
    }

    if (!roles.includes(req.user.role)) {
      return sendError(res, 403, "You do not have permission to perform this action");
    }

    next();
  };
}

module.exports = { requireRole };
