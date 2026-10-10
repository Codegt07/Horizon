const User = require("../models/User");
const { issueAuthCookie, issuePartialCookie, clearAuthCookie, verifyToken } = require("../utils/token");
const { sendSuccess, sendError } = require("../utils/response");
const { registerSchema, loginSchema, completeProfileSchema, validate } = require("../validators/auth.validator");
const { env } = require("../config/env");

async function register(req, res, next) {
  try {
    const { data, errors } = validate(registerSchema, req.body);
    if (errors) return sendError(res, 400, "Validation failed", errors);

    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) return sendError(res, 409, "Email already in use");

    // Pre-save hook will hash the password
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

async function login(req, res, next) {
  try {
    const { data, errors } = validate(loginSchema, req.body);
    if (errors) return sendError(res, 400, "Validation failed", errors);

    const user = await User.findOne({ email: data.email });

    // Deliberately vague to prevent email enumeration
    if (!user || !(await user.comparePassword(data.password))) {
      return sendError(res, 401, "Invalid email or password");
    }

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

function logout(req, res) {
  clearAuthCookie(res);
  return sendSuccess(res, 200, "Logged out successfully");
}

async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return sendError(res, 404, "User not found");

    return sendSuccess(res, 200, "User profile retrieved", user);
  } catch (err) {
    next(err);
  }
}

function googleCallback(req, res) {
  const user = req.user;

  if (user.isProfileComplete) {
    issueAuthCookie(res, {
      userId: user._id.toString(),
      role: user.role,
      isProfileComplete: true,
    });
    return res.redirect(`${env.CLIENT_URL}/dashboard`);
  }

  // New OAuth user needs to complete profile
  issuePartialCookie(res, { userId: user._id.toString() });
  return res.redirect(`${env.CLIENT_URL}/complete-profile`);
}

function googleFailure(req, res) {
  return res.redirect(`${env.CLIENT_URL}/login?error=oauth_failed`);
}

async function completeProfile(req, res, next) {
  try {
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

    const { data, errors } = validate(completeProfileSchema, req.body);
    if (errors) return sendError(res, 400, "Validation failed", errors);

    const user = await User.findById(payload.userId);
    if (!user) return sendError(res, 404, "User not found");

    if (user.isProfileComplete) {
      return sendError(res, 409, "Profile is already complete");
    }

    // Only allow OAuth accounts to use this endpoint
    if (user.passwordHash !== null) {
      return sendError(res, 403, "This endpoint is only for OAuth accounts");
    }

    user.name = data.name;
    user.role = data.role;
    user.isProfileComplete = true;
    await user.save();

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
