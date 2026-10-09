const User = require("../models/User");
const { issueAuthCookie, issuePartialCookie, clearAuthCookie, verifyToken } = require("../utils/token");
const { sendSuccess, sendError } = require("../utils/response");
const { registerSchema, loginSchema, completeProfileSchema, validate } = require("../validators/auth.validator");
const { env } = require("../config/env");

// ── Email / password ──────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Create a new user account with a chosen role.
 */
async function register(req, res, next) {
  try {
    const { data, errors } = validate(registerSchema, req.body);
    if (errors) return sendError(res, 400, "Validation failed", errors);

    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) return sendError(res, 409, "Email already in use");

    // Store the plain password — the User pre-save hook hashes it
    const user = await User.create({
      name: data.name,
      email: data.email,
      passwordHash: data.password,
      role: data.role,
    });

    issueAuthCookie(res, {
      userId: user._id.toString(),
      role: user.role,
      isProfileComplete: user.isProfileComplete,
    });

    return sendSuccess(res, 201, "Registration successful", user);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * Authenticate with email and password, issue JWT cookie.
 */
async function login(req, res, next) {
  try {
    const { data, errors } = validate(loginSchema, req.body);
    if (errors) return sendError(res, 400, "Validation failed", errors);

    const user = await User.findOne({ email: data.email });

    // Deliberately vague — do not reveal whether the email exists
    if (!user || !(await user.comparePassword(data.password))) {
      return sendError(res, 401, "Invalid email or password");
    }

    // Account was created via Google OAuth and has no password
    if (!user.passwordHash) {
      return sendError(res, 401, "This account uses Google login");
    }

    issueAuthCookie(res, {
      userId: user._id.toString(),
      role: user.role,
      isProfileComplete: user.isProfileComplete,
    });

    return sendSuccess(res, 200, "Login successful", user);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * Clear the auth cookie.
 */
function logout(req, res) {
  clearAuthCookie(res);
  return sendSuccess(res, 200, "Logged out successfully");
}

/**
 * GET /api/auth/me
 * Return the currently authenticated user's profile.
 */
async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return sendError(res, 404, "User not found");

    return sendSuccess(res, 200, "User profile retrieved", user);
  } catch (err) {
    next(err);
  }
}

// ── Google OAuth ──────────────────────────────────────────────────────────────

/**
 * GET /api/auth/google/callback  (called by Passport after Google redirects back)
 *
 * Passport has already run the strategy verify callback and attached the user
 * to req.user. We decide here whether the user is complete or needs to finish
 * their profile.
 */
function googleCallback(req, res) {
  const user = req.user;

  if (user.isProfileComplete) {
    // Fully known user — issue normal 7-day cookie and go to dashboard
    issueAuthCookie(res, {
      userId: user._id.toString(),
      role: user.role,
      isProfileComplete: true,
    });
    return res.redirect(`${env.CLIENT_URL}/dashboard`);
  }

  // New OAuth user — issue a 15-min partial cookie and send to profile form
  issuePartialCookie(res, { userId: user._id.toString() });
  return res.redirect(`${env.CLIENT_URL}/complete-profile`);
}

/**
 * GET /api/auth/google/callback  (failure branch — Passport calls this when
 * the Google auth itself fails, e.g. user denies consent)
 *
 * We redirect rather than returning JSON because the browser is in a
 * Passport-initiated redirect flow at this point.
 */
function googleFailure(req, res) {
  return res.redirect(`${env.CLIENT_URL}/login?error=oauth_failed`);
}

// ── Profile completion ────────────────────────────────────────────────────────

/**
 * POST /api/auth/complete-profile
 *
 * Validates the partial JWT from the httpOnly cookie (type === "partial"),
 * then updates the user's name and role.
 *
 * This route is intentionally NOT behind the `authenticate` middleware —
 * that middleware rejects partial tokens. Token verification is done inline.
 */
async function completeProfile(req, res, next) {
  try {
    // ── 1. Verify the partial token from the cookie ───────────────────────
    const rawToken = req.cookies?.token;

    if (!rawToken) {
      return sendError(res, 401, "Authentication required");
    }

    let payload;
    try {
      payload = verifyToken(rawToken);
    } catch {
      return sendError(res, 401, "Invalid or expired token");
    }

    if (payload.type !== "partial") {
      return sendError(res, 401, "Invalid token type");
    }

    // ── 2. Validate the submitted profile fields ──────────────────────────
    const { data, errors } = validate(completeProfileSchema, req.body);
    if (errors) return sendError(res, 400, "Validation failed", errors);

    // ── 3. Load and update the user ───────────────────────────────────────
    const user = await User.findById(payload.userId);
    if (!user) return sendError(res, 404, "User not found");

    // Guard: do not re-complete an already complete profile via this route
    if (user.isProfileComplete) {
      return sendError(res, 409, "Profile is already complete");
    }

    // Guard: email/password accounts are not modified through this OAuth-only route
    if (user.passwordHash !== null) {
      return sendError(res, 403, "This endpoint is only for OAuth accounts");
    }

    user.name = data.name;
    user.role = data.role;
    user.isProfileComplete = true;
    await user.save();

    // ── 4. Issue full auth cookie and return sanitised user ───────────────
    issueAuthCookie(res, {
      userId: user._id.toString(),
      role: user.role,
      isProfileComplete: true,
    });

    return sendSuccess(res, 200, "Profile completed successfully", user);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, logout, me, googleCallback, googleFailure, completeProfile };
