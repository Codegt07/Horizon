const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

/**
 * Sign a JWT and set it as an httpOnly cookie on the response.
 *
 * @param {import("express").Response} res
 * @param {{ userId: string, role: string, isProfileComplete: boolean }} payload
 */
function issueAuthCookie(res, payload) {
  const token = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });
}

/**
 * Verify a JWT string and return its decoded payload.
 * Throws JsonWebTokenError or TokenExpiredError on failure.
 *
 * @param {string} token
 * @returns {{ userId: string, role: string, isProfileComplete: boolean }}
 */
function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

module.exports = { issueAuthCookie, verifyToken };
