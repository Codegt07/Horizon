const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");

// Must be set before any src/ module is required
process.env.NODE_ENV = "test";
process.env.MONGO_URI = "placeholder";
process.env.JWT_SECRET = "test_secret_for_jest_at_least_16_chars";

const app = require("../src/app");
const User = require("../src/models/User");

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
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const INVESTOR = {
  name: "Alice Investor",
  email: "alice@example.com",
  password: "Password123",
  role: "investor",
};

const FUNDRAISER = {
  name: "Bob Fundraiser",
  email: "bob@example.com",
  password: "Password456",
  role: "fundraiser",
};

/** Register a user and return the supertest response */
function registerUser(data = INVESTOR) {
  return request(app).post("/api/auth/register").send(data);
}

/** Register then login; returns { cookie, body } */
async function loginUser(data = INVESTOR) {
  await registerUser(data);
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: data.email, password: data.password });
  const cookie = res.headers["set-cookie"];
  return { cookie, body: res.body };
}

/** Extract the token value from a Set-Cookie header array */
function extractToken(setCookieHeader) {
  if (!setCookieHeader) return null;
  const match = setCookieHeader[0].match(/token=([^;]+)/);
  return match ? match[1] : null;
}

// ── POST /api/auth/register ───────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  it("registers a new investor and returns 201 with user data", async () => {
    const res = await registerUser(INVESTOR);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(INVESTOR.email);
    expect(res.body.data.role).toBe("investor");
  });

  it("registers a new fundraiser successfully", async () => {
    const res = await registerUser(FUNDRAISER);

    expect(res.statusCode).toBe(201);
    expect(res.body.data.role).toBe("fundraiser");
  });

  it("sets an httpOnly cookie on successful registration", async () => {
    const res = await registerUser(INVESTOR);

    const setCookie = res.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    expect(setCookie[0]).toMatch(/token=/);
    expect(setCookie[0]).toMatch(/HttpOnly/i);
  });

  it("never returns passwordHash in the response body", async () => {
    const res = await registerUser(INVESTOR);

    expect(res.body.data).not.toHaveProperty("passwordHash");
  });

  it("returns 409 when email is already registered", async () => {
    await registerUser(INVESTOR);
    const res = await registerUser(INVESTOR);

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/email already in use/i);
  });

  it("returns 400 for missing required fields", async () => {
    const res = await request(app).post("/api/auth/register").send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it("returns 400 for an invalid email", async () => {
    const res = await registerUser({ ...INVESTOR, email: "not-an-email" });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors.some((e) => e.field === "email")).toBe(true);
  });

  it("returns 400 when password is too short", async () => {
    const res = await registerUser({ ...INVESTOR, password: "short" });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors.some((e) => e.field === "password")).toBe(true);
  });

  it("returns 400 for an invalid role", async () => {
    const res = await registerUser({ ...INVESTOR, role: "admin" });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors.some((e) => e.field === "role")).toBe(true);
  });

  it("hashes the password before storing it", async () => {
    await registerUser(INVESTOR);
    const user = await User.findOne({ email: INVESTOR.email }).select("+passwordHash");

    expect(user.passwordHash).toBeDefined();
    expect(user.passwordHash).not.toBe(INVESTOR.password);
    expect(user.passwordHash).toMatch(/^\$2[ab]\$12\$/);
  });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  it("logs in with correct credentials and returns 200", async () => {
    await registerUser(INVESTOR);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: INVESTOR.email, password: INVESTOR.password });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(INVESTOR.email);
  });

  it("sets an httpOnly cookie on successful login", async () => {
    await registerUser(INVESTOR);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: INVESTOR.email, password: INVESTOR.password });

    const setCookie = res.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    expect(setCookie[0]).toMatch(/token=/);
    expect(setCookie[0]).toMatch(/HttpOnly/i);
  });

  it("never returns passwordHash in the login response", async () => {
    await registerUser(INVESTOR);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: INVESTOR.email, password: INVESTOR.password });

    expect(res.body.data).not.toHaveProperty("passwordHash");
  });

  it("returns 401 for a wrong password", async () => {
    await registerUser(INVESTOR);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: INVESTOR.email, password: "wrongpassword" });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 for a non-existent email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "Password123" });

    expect(res.statusCode).toBe(401);
  });

  it("returns 400 for missing credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it("returns 400 for an invalid email format", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "bad", password: "Password123" });

    expect(res.statusCode).toBe(400);
  });

  it("gives the same vague error for wrong email and wrong password (no enumeration)", async () => {
    await registerUser(INVESTOR);
    const wrongEmail = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "Password123" });

    const wrongPass = await request(app)
      .post("/api/auth/login")
      .send({ email: INVESTOR.email, password: "wrongpassword" });

    expect(wrongEmail.body.message).toBe(wrongPass.body.message);
  });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────

describe("POST /api/auth/logout", () => {
  it("returns 200 and clears the token cookie", async () => {
    const { cookie } = await loginUser(INVESTOR);

    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // The cleared cookie should have an empty value or Max-Age=0
    const setCookie = res.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    expect(setCookie[0]).toMatch(/token=;|Max-Age=0/);
  });

  it("returns 401 when called without a cookie", async () => {
    const res = await request(app).post("/api/auth/logout");

    expect(res.statusCode).toBe(401);
  });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

describe("GET /api/auth/me", () => {
  it("returns the current user's profile", async () => {
    const { cookie } = await loginUser(INVESTOR);

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.email).toBe(INVESTOR.email);
    expect(res.body.data.role).toBe("investor");
  });

  it("never returns passwordHash", async () => {
    const { cookie } = await loginUser(INVESTOR);

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookie);

    expect(res.body.data).not.toHaveProperty("passwordHash");
  });

  it("returns 401 without a cookie", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.statusCode).toBe(401);
  });

  it("returns 401 with a tampered token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", ["token=this.is.not.a.valid.jwt"]);

    expect(res.statusCode).toBe(401);
  });
});

// ── Authentication middleware ─────────────────────────────────────────────────

describe("authenticate middleware", () => {
  it("allows access with a valid cookie", async () => {
    const { cookie } = await loginUser(INVESTOR);
    const res = await request(app).get("/api/auth/me").set("Cookie", cookie);

    expect(res.statusCode).toBe(200);
  });

  it("blocks access with no cookie", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.statusCode).toBe(401);
  });

  it("blocks access with an expired/invalid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", ["token=invalid.token.value"]);

    expect(res.statusCode).toBe(401);
  });
});

// ── Role-based authorization (requireRole) ────────────────────────────────────
//
// We test RBAC through a minimal isolated Express app so we don't depend on
// routes that haven't been implemented yet, and avoid the 404-handler ordering
// problem that comes with registering routes on the main app after module load.

describe("requireRole middleware", () => {
  const express = require("express");
  const cookieParser = require("cookie-parser");
  const { authenticate } = require("../src/middlewares/authenticate");
  const { requireRole } = require("../src/middlewares/requireRole");
  const { sendSuccess } = require("../src/utils/response");

  // Minimal app with only the middleware stack under test
  const testApp = express();
  testApp.use(cookieParser());
  testApp.get(
    "/investor-only",
    authenticate,
    requireRole("investor"),
    (req, res) => sendSuccess(res, 200, "ok")
  );
  testApp.get(
    "/fundraiser-only",
    authenticate,
    requireRole("fundraiser"),
    (req, res) => sendSuccess(res, 200, "ok")
  );

  it("allows an investor to access an investor-only route", async () => {
    const { cookie } = await loginUser(INVESTOR);
    const res = await request(testApp)
      .get("/investor-only")
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(200);
  });

  it("blocks a fundraiser from an investor-only route", async () => {
    const { cookie } = await loginUser(FUNDRAISER);
    const res = await request(testApp)
      .get("/investor-only")
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(403);
  });

  it("allows a fundraiser to access a fundraiser-only route", async () => {
    const { cookie } = await loginUser(FUNDRAISER);
    const res = await request(testApp)
      .get("/fundraiser-only")
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(200);
  });

  it("blocks an investor from a fundraiser-only route", async () => {
    const { cookie } = await loginUser(INVESTOR);
    const res = await request(testApp)
      .get("/fundraiser-only")
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(403);
  });

  it("returns 401 on a protected route when no cookie is provided", async () => {
    const res = await request(testApp).get("/investor-only");

    expect(res.statusCode).toBe(401);
  });
});
