const { Router } = require("express");
const { rateLimit } = require("express-rate-limit");

const { register, login, logout, me } = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/authenticate");
const { env } = require("../config/env");

const router = Router();

// Stricter rate limit on auth endpoints — disabled in test to avoid
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

router.post("/register", authLimiter, register);
router.post("/login",    authLimiter, login);
router.post("/logout",   authenticate, logout);
router.get("/me",        authenticate, me);

module.exports = router;
