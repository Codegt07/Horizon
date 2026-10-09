const { Router } = require("express");
const passport = require("passport");
const { rateLimit } = require("express-rate-limit");

const {
  register,
  login,
  logout,
  me,
  googleCallback,
  googleFailure,
  completeProfile,
} = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/authenticate");
const { env } = require("../config/env");

const router = Router();

// Stricter rate limit on credential endpoints — disabled in test to avoid
// polluting integration test request counts
const authLimiter =
  env.NODE_ENV !== "test"
    ? rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 20,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, message: "Too many attempts, please try again later" },
      })
    : (req, res, next) => next(); // no-op in test

// ── Email / password ──────────────────────────────────────────────────────────
router.post("/register", authLimiter, register);
router.post("/login",    authLimiter, login);
router.post("/logout",   authenticate, logout);
router.get("/me",        authenticate, me);

// ── Google OAuth ──────────────────────────────────────────────────────────────
// Initiates the Google consent screen
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

// Google redirects back here after the user grants (or denies) consent
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/api/auth/google/failure",
  }),
  googleCallback
);

// Explicit failure route — redirects browser to the frontend error page
router.get("/google/failure", googleFailure);

// ── Profile completion (partial-token protected, NOT behind authenticate) ─────
router.post("/complete-profile", completeProfile);

module.exports = router;
