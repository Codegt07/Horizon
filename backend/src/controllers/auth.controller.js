const User = require("../models/User");
const { issueAuthCookie } = require("../utils/token");
const { sendSuccess, sendError } = require("../utils/response");
const { registerSchema, loginSchema, validate } = require("../validators/auth.validator");

/**
 * POST /api/auth/register
 * Create a new user account. Role is chosen by the user at registration.
 */
async function register(req, res, next) {
  try {
    const { data, errors } = validate(registerSchema, req.body);
    if (errors) return sendError(res, 400, "Validation failed", errors);

    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) return sendError(res, 409, "Email already in use");

    // Store the plain password in passwordHash — the pre-save hook hashes it
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

    // Deliberately vague message — don't reveal whether the email exists
    if (!user || !(await user.comparePassword(data.password))) {
      return sendError(res, 401, "Invalid email or password");
    }

    // Accounts created via Google OAuth have no password
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
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
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

module.exports = { register, login, logout, me };
