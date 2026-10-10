const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const { rateLimit } = require("express-rate-limit");

const { env } = require("./config/env");
const { configurePassport } = require("./config/passport");
const { errorHandler } = require("./middlewares/errorHandler");
const { sendSuccess } = require("./utils/response");

const app = express();

// Configure Passport strategy before any routes are registered
configurePassport();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true, // allow cookies cross-origin
  })
);

// ── Global rate limiter (disabled in test to avoid poisoning integration tests) ─
if (env.NODE_ENV !== "test") {
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, please try again later" },
  });
  app.use(globalLimiter);
}

// ── Body & cookie parsing ─────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Passport (no sessions — JWT cookies carry auth state) ────────────────────
app.use(passport.initialize());

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  sendSuccess(res, 200, "Server is running", {
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use("/api/auth",          require("./routes/auth.routes"));
app.use("/api/opportunities", require("./routes/opportunity.routes"));
app.use("/api/investments",   require("./routes/investment.routes"));
app.use("/api/wallet",        require("./routes/wallet.routes"));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ── Centralized error handler (must be last) ──────────────────────────────────
app.use(errorHandler);

module.exports = app;
