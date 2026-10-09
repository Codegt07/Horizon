/**
 * Phase 3 — Google OAuth + profile completion integration tests.
 *
 * Strategy: We replace the passport "google" strategy with a lightweight
 * MockStrategy before any test runs. Each test controls what Google "returns"
 * by calling setMockProfile(). This means zero real HTTP calls and no Google
 * credentials required.
 */

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const passport = require("passport");
const jwt = require("jsonwebtoken");

// Env must be set before any src/ module is loaded
process.env.NODE_ENV = "test";
process.env.MONGO_URI = "placeholder";
process.env.JWT_SECRET = "test_secret_for_jest_at_least_16_chars";
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
process.env.GOOGLE_CALLBACK_URL = "http://localhost:5000/api/auth/google/callback";
process.env.CLIENT_URL = "http://localhost:5173";

// ── Mock Passport Google strategy ────────────────────────────────────────────
// Must be installed BEFORE app.js is required so configurePassport() runs
// first, then we immediately overwrite the strategy.
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");

let _mockVerifyResult = null; // { err, user } set per-test via setMockProfile()

/**
 * Inject what the Google strategy "verify callback" should return.
 * Call this at the start of each test that exercises an OAuth route.
 *
 * @param {object|null} user  - the user object Passport passes to req.user
 * @param {Error|null}  err   - simulate a strategy error (optional)
 */
function setMockProfile(user, err = null) {
  _mockVerifyResult = { user, err };
}

// Replace the real GoogleStrategy with a mock that reads _mockVerifyResult
class MockGoogleStrategy extends GoogleStrategy {
  constructor() {
    // GoogleStrategy requires clientID / clientSecret — provide dummies
    super(
      {
        clientID: "mock",
        clientSecret: "mock",
        callbackURL: "mock",
      },
      // This verify callback is never actually called in tests — authenticate()
      // is short-circuited via the authenticate mock below.
      (_at, _rt, _profile, done) => done(null, false)
    );
    this.name = "google";
  }

  // Override authenticate() so it never contacts Google
  authenticate(req) {
    if (!_mockVerifyResult) {
      return this.fail({ message: "setMockProfile() not called" });
    }
    if (_mockVerifyResult.err) {
      return this.error(_mockVerifyResult.err);
    }
    if (!_mockVerifyResult.user) {
      return this.fail({ message: "OAuth failed" });
    }
    this.success(_mockVerifyResult.user);
  }
}

// Register the mock strategy BEFORE app.js loads (so configurePassport's
// real strategy is immediately overwritten)
passport.use(new MockGoogleStrategy());

// Now load the app — configurePassport() runs inside, but we overwrite it
const app = require("../src/app");
// Re-install mock after app loads (configurePassport may have re-registered)
passport.use(new MockGoogleStrategy());

const User = require("../src/models/User");

// ── DB setup ──────────────────────────────────────────────────────────────────

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
  _mockVerifyResult = null;
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Create a user directly in the DB (bypasses HTTP layer) */
function createUser(overrides = {}) {
  return User.create({
    name: "Test User",
    email: "test@example.com",
    passwordHash: null,
    googleId: "google-123",
    role: "investor",
    isProfileComplete: true,
    walletBalance: 0,
    ...overrides,
  });
}

/** Mint a partial JWT cookie string the same way issuePartialCookie does */
function makePartialCookie(userId, options = {}) {
  const token = jwt.sign(
    { userId: userId.toString(), type: "partial", ...options },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
  return [`token=${token}; Path=/; HttpOnly`];
}

/** Mint a full auth cookie string */
function makeAuthCookie(userId, role = "investor") {
  const token = jwt.sign(
    { userId: userId.toString(), role, isProfileComplete: true, type: "auth" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
  return [`token=${token}; Path=/; HttpOnly`];
}

// ── Google OAuth callback ─────────────────────────────────────────────────────

describe("GET /api/auth/google/callback — complete profile", () => {
  it("issues full auth cookie and redirects to /dashboard for a complete user", async () => {
    const user = await createUser({ isProfileComplete: true });
    setMockProfile(user);

    const res = await request(app).get("/api/auth/google/callback");

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("/dashboard");

    const setCookie = res.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    expect(setCookie[0]).toMatch(/token=/);
    expect(setCookie[0]).toMatch(/HttpOnly/i);

    // Decode and confirm type=auth
    const token = setCookie[0].match(/token=([^;]+)/)[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    expect(payload.type).toBe("auth");
    expect(payload.isProfileComplete).toBe(true);
  });

  it("issues partial cookie and redirects to /complete-profile for an incomplete user", async () => {
    const user = await createUser({
      isProfileComplete: false,
      role: "investor", // placeholder role
    });
    setMockProfile(user);

    const res = await request(app).get("/api/auth/google/callback");

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("/complete-profile");

    const setCookie = res.headers["set-cookie"];
    expect(setCookie).toBeDefined();

    const token = setCookie[0].match(/token=([^;]+)/)[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    expect(payload.type).toBe("partial");
    expect(payload.userId).toBe(user._id.toString());
  });
});

describe("GET /api/auth/google/callback — OAuth failure", () => {
  it("redirects to the failure route when Google auth fails", async () => {
    setMockProfile(null); // null user triggers Passport failureRedirect

    const res = await request(app).get("/api/auth/google/callback");

    // Passport issues a 302 to /api/auth/google/failure (the internal failure
    // route). Supertest does not follow redirects, so we assert on that hop.
    // The failure route itself then redirects to CLIENT_URL/login?error=oauth_failed.
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("/google/failure");
  });

  it("failure route redirects to CLIENT_URL/login?error=oauth_failed", async () => {
    // Hit the failure route directly to test its own redirect
    const res = await request(app).get("/api/auth/google/failure");

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("oauth_failed");
  });

  it("does not expose error details in the redirect URL", async () => {
    setMockProfile(null);

    const res = await request(app).get("/api/auth/google/callback");

    // Location must not contain stack traces or secret values
    expect(res.headers.location).not.toMatch(/secret|stack|Error/i);
  });
});

// ── Account handling ──────────────────────────────────────────────────────────

describe("Google OAuth — account handling", () => {
  it("signs in an existing user matched by googleId without creating a duplicate", async () => {
    const existing = await createUser({ googleId: "google-abc", isProfileComplete: true });
    setMockProfile(existing);

    await request(app).get("/api/auth/google/callback");

    // Exactly one user must exist
    const count = await User.countDocuments();
    expect(count).toBe(1);
  });

  it("links Google identity to an existing email account without duplication", async () => {
    // Simulate the passport strategy linking an existing email account
    const existing = await createUser({
      email: "linked@example.com",
      googleId: "google-new-id",
      isProfileComplete: true,
    });
    setMockProfile(existing);

    await request(app).get("/api/auth/google/callback");

    const count = await User.countDocuments({ email: "linked@example.com" });
    expect(count).toBe(1);
  });

  it("does not grant full access when a new OAuth user has incomplete profile", async () => {
    const incompleteUser = await createUser({ isProfileComplete: false });
    setMockProfile(incompleteUser);

    const res = await request(app).get("/api/auth/google/callback");

    // Must redirect to profile completion, not dashboard
    expect(res.headers.location).toContain("/complete-profile");
    expect(res.headers.location).not.toContain("/dashboard");
  });
});

// ── POST /api/auth/complete-profile ──────────────────────────────────────────

describe("POST /api/auth/complete-profile — success", () => {
  it("completes profile, issues full auth cookie, and returns sanitised user", async () => {
    const user = await createUser({ isProfileComplete: false });
    const cookie = makePartialCookie(user._id);

    const res = await request(app)
      .post("/api/auth/complete-profile")
      .set("Cookie", cookie)
      .send({ name: "Alice OAuth", role: "fundraiser" });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Alice OAuth");
    expect(res.body.data.role).toBe("fundraiser");
    expect(res.body.data.isProfileComplete).toBe(true);
    expect(res.body.data).not.toHaveProperty("passwordHash");

    // Cookie must now be a full auth token
    const setCookie = res.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    const token = setCookie[0].match(/token=([^;]+)/)[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    expect(payload.type).toBe("auth");
    expect(payload.role).toBe("fundraiser");
  });

  it("persists the updated name and role in the database", async () => {
    const user = await createUser({ isProfileComplete: false });
    const cookie = makePartialCookie(user._id);

    await request(app)
      .post("/api/auth/complete-profile")
      .set("Cookie", cookie)
      .send({ name: "Persisted Name", role: "investor" });

    const updated = await User.findById(user._id);
    expect(updated.name).toBe("Persisted Name");
    expect(updated.role).toBe("investor");
    expect(updated.isProfileComplete).toBe(true);
  });
});

describe("POST /api/auth/complete-profile — token validation", () => {
  it("returns 401 with no cookie", async () => {
    const res = await request(app)
      .post("/api/auth/complete-profile")
      .send({ name: "Test", role: "investor" });

    expect(res.statusCode).toBe(401);
  });

  it("returns 401 with a full auth token (wrong type)", async () => {
    const user = await createUser({ isProfileComplete: false });
    const cookie = makeAuthCookie(user._id); // type=auth, not partial

    const res = await request(app)
      .post("/api/auth/complete-profile")
      .set("Cookie", cookie)
      .send({ name: "Test", role: "investor" });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/invalid token type/i);
  });

  it("returns 401 with a tampered token", async () => {
    const res = await request(app)
      .post("/api/auth/complete-profile")
      .set("Cookie", ["token=this.is.garbage; Path=/; HttpOnly"])
      .send({ name: "Test", role: "investor" });

    expect(res.statusCode).toBe(401);
  });

  it("returns 401 with an expired partial token", async () => {
    const user = await createUser({ isProfileComplete: false });
    const expiredToken = jwt.sign(
      { userId: user._id.toString(), type: "partial" },
      process.env.JWT_SECRET,
      { expiresIn: "0s" } // immediately expired
    );

    const res = await request(app)
      .post("/api/auth/complete-profile")
      .set("Cookie", [`token=${expiredToken}; Path=/; HttpOnly`])
      .send({ name: "Test", role: "investor" });

    expect(res.statusCode).toBe(401);
  });

  it("returns 409 if the profile is already complete", async () => {
    const user = await createUser({ isProfileComplete: true });
    const cookie = makePartialCookie(user._id);

    const res = await request(app)
      .post("/api/auth/complete-profile")
      .set("Cookie", cookie)
      .send({ name: "Test", role: "investor" });

    expect(res.statusCode).toBe(409);
  });
});

describe("POST /api/auth/complete-profile — input validation", () => {
  it("returns 400 for a missing name", async () => {
    const user = await createUser({ isProfileComplete: false });
    const cookie = makePartialCookie(user._id);

    const res = await request(app)
      .post("/api/auth/complete-profile")
      .set("Cookie", cookie)
      .send({ role: "investor" });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors.some((e) => e.field === "name")).toBe(true);
  });

  it("returns 400 for a missing role", async () => {
    const user = await createUser({ isProfileComplete: false });
    const cookie = makePartialCookie(user._id);

    const res = await request(app)
      .post("/api/auth/complete-profile")
      .set("Cookie", cookie)
      .send({ name: "Test" });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors.some((e) => e.field === "role")).toBe(true);
  });

  it("returns 400 for an invalid role", async () => {
    const user = await createUser({ isProfileComplete: false });
    const cookie = makePartialCookie(user._id);

    const res = await request(app)
      .post("/api/auth/complete-profile")
      .set("Cookie", cookie)
      .send({ name: "Test", role: "admin" });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors.some((e) => e.field === "role")).toBe(true);
  });

  it("returns 400 for an empty name string", async () => {
    const user = await createUser({ isProfileComplete: false });
    const cookie = makePartialCookie(user._id);

    const res = await request(app)
      .post("/api/auth/complete-profile")
      .set("Cookie", cookie)
      .send({ name: "   ", role: "investor" });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors.some((e) => e.field === "name")).toBe(true);
  });
});

// ── Protected route access for incomplete profiles ────────────────────────────

describe("Incomplete OAuth profile — access control", () => {
  it("blocks an incomplete user from accessing GET /api/auth/me", async () => {
    const user = await createUser({ isProfileComplete: false });
    const cookie = makePartialCookie(user._id);

    // /me uses authenticate middleware which rejects type=partial tokens
    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(401);
  });

  it("allows the same user to access /me after completing profile", async () => {
    const user = await createUser({ isProfileComplete: false });
    const partialCookie = makePartialCookie(user._id);

    // Complete the profile
    const completionRes = await request(app)
      .post("/api/auth/complete-profile")
      .set("Cookie", partialCookie)
      .send({ name: "Completed User", role: "investor" });

    expect(completionRes.statusCode).toBe(200);

    // Use the new full auth cookie
    const fullCookie = completionRes.headers["set-cookie"];
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Cookie", fullCookie);

    expect(meRes.statusCode).toBe(200);
    expect(meRes.body.data.isProfileComplete).toBe(true);
  });
});

// ── Fix 2: completeProfile must not modify email/password accounts ────────────

describe("POST /api/auth/complete-profile — email/password account guard", () => {
  it("returns 403 when the token references an email/password user", async () => {
    // Create a user with a real passwordHash (email/password registration)
    const pwUser = await User.create({
      name: "Password User",
      email: "pwuser@example.com",
      passwordHash: "hashed_password_value", // non-null = email/password account
      role: "investor",
      isProfileComplete: false, // force isProfileComplete false to reach the new guard
      googleId: null,
      walletBalance: 0,
    });

    const cookie = makePartialCookie(pwUser._id);

    const res = await request(app)
      .post("/api/auth/complete-profile")
      .set("Cookie", cookie)
      .send({ name: "Hacked Name", role: "fundraiser" });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);

    // Confirm nothing was modified
    const unchanged = await User.findById(pwUser._id);
    expect(unchanged.name).toBe("Password User");
    expect(unchanged.role).toBe("investor");
    expect(unchanged.isProfileComplete).toBe(false);
  });
});
