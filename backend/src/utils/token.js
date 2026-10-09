const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

// Shared cookie security attributes — one place so every Set-Cookie and
// clearCookie call stays in sync.
const BASE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
};

/**
 * Sign a full-auth JWT (type: "auth") and set it as an httpOnly cookie.
 * Used after successful registration, email/password login, or OAuth completion.
 *
 * @param {import("express").Response} res
 * @param {{ userId: string, role: string, isProfileComplete: boolean }} payload
 */
function issueAuthCookie(res, payload) {
  const token = jwt.sign(
    { ...payload, type: "auth" },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  res.cookie("token", token, {
    ...BASE_COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });
}

/**
 * Sign a short-lived partial JWT (type: "partial") for OAuth profile completion
 * and set it as an httpOnly cookie. Only valid for POST /api/auth/complete-profile.
 *
 * @param {import("express").Response} res
 * @param {{ userId: string }} payload
 */
function issuePartialCookie(res, payload) {
  const token = jwt.sign(
    { ...payload, type: "partial" },
    env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  res.cookie("token", token, {
    ...BASE_COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000, // 15 minutes in ms
  });
}

/**
 * Clear the auth or partial cookie.
 * Only path must match the original Set-Cookie; all other attributes are
 * irrelevant to the browser's deletion logic.
 *
 * @param {import("express").Response} res
 */
function clearAuthCookie(res) {
  res.clearCookie("token", { path: "/" });
}

/**
 * Verify a JWT string and return its decoded payload.
 * Throws JsonWebTokenError or TokenExpiredError on failure.
 *
 * @param {string} token
 * @returns {object}
 */
function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

module.exports = { issueAuthCookie, issuePartialCookie, clearAuthCookie, verifyToken };
