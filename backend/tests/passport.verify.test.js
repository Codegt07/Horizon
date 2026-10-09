/**
 * Unit tests for the findOrCreateUser() function in src/config/passport.js.
 *
 * These tests exercise the account-matching and email-verification logic
 * directly, without going through Passport's HTTP machinery or the mock
 * strategy. Every branch of the verify callback is covered here.
 */

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

process.env.NODE_ENV = "test";
process.env.MONGO_URI = "placeholder";
process.env.JWT_SECRET = "test_secret_for_jest_at_least_16_chars";

const { findOrCreateUser } = require("../src/config/passport");
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

const GOOGLE_ID = "google-uid-123";
const VERIFIED_EMAIL = { value: "alice@example.com", verified: true };
const UNVERIFIED_EMAIL = { value: "alice@example.com", verified: false };
const EMAIL_NO_VERIFIED_FIELD = { value: "alice@example.com" }; // verified: undefined

function makeExistingUser(overrides = {}) {
  return User.create({
    name: "Existing User",
    email: "alice@example.com",
    passwordHash: null,
    googleId: null,
    role: "investor",
    isProfileComplete: true,
    walletBalance: 0,
    ...overrides,
  });
}

// ── Case 1: googleId match ────────────────────────────────────────────────────

describe("findOrCreateUser — Case 1: googleId match", () => {
  it("returns the existing user when googleId matches", async () => {
    const existing = await makeExistingUser({ googleId: GOOGLE_ID });

    const result = await findOrCreateUser(GOOGLE_ID, VERIFIED_EMAIL, "Alice");

    expect(result._id.toString()).toBe(existing._id.toString());
    expect(await User.countDocuments()).toBe(1);
  });

  it("does not create a duplicate when googleId matches", async () => {
    await makeExistingUser({ googleId: GOOGLE_ID });

    await findOrCreateUser(GOOGLE_ID, VERIFIED_EMAIL, "Alice");

    expect(await User.countDocuments()).toBe(1);
  });
});

// ── Case 2: verified email match ──────────────────────────────────────────────

describe("findOrCreateUser — Case 2: verified email linking", () => {
  it("links googleId to an existing account when email is verified", async () => {
    const existing = await makeExistingUser({ googleId: null });

    const result = await findOrCreateUser(GOOGLE_ID, VERIFIED_EMAIL, "Alice");

    expect(result._id.toString()).toBe(existing._id.toString());

    const refreshed = await User.findById(existing._id);
    expect(refreshed.googleId).toBe(GOOGLE_ID);
  });

  it("does not create a new account when a verified email already exists", async () => {
    await makeExistingUser({ googleId: null });

    await findOrCreateUser(GOOGLE_ID, VERIFIED_EMAIL, "Alice");

    expect(await User.countDocuments()).toBe(1);
  });

  it("does NOT link to an existing account when email is unverified", async () => {
    await makeExistingUser({ googleId: null });

    // Should fall through to Case 3 and create a NEW user
    const result = await findOrCreateUser(GOOGLE_ID, UNVERIFIED_EMAIL, "Alice");

    expect(await User.countDocuments()).toBe(2);
    expect(result.googleId).toBe(GOOGLE_ID);
    // The new user should have null email (unverified email not stored)
    expect(result.email).toBeNull();
  });

  it("does NOT link when verified field is missing (undefined)", async () => {
    await makeExistingUser({ googleId: null });

    const result = await findOrCreateUser(GOOGLE_ID, EMAIL_NO_VERIFIED_FIELD, "Alice");

    expect(await User.countDocuments()).toBe(2);
    expect(result.email).toBeNull();
  });

  it("does NOT link when emailObj is null (email scope not granted)", async () => {
    await makeExistingUser({ googleId: null });

    const result = await findOrCreateUser(GOOGLE_ID, null, "Alice");

    expect(await User.countDocuments()).toBe(2);
    expect(result.email).toBeNull();
  });

  it("never overwrites an existing user's role or name when linking", async () => {
    await makeExistingUser({ googleId: null, name: "Original", role: "fundraiser" });

    const result = await findOrCreateUser(GOOGLE_ID, VERIFIED_EMAIL, "NewName");

    expect(result.name).toBe("Original");
    expect(result.role).toBe("fundraiser");
  });
});

// ── Case 3: new user ──────────────────────────────────────────────────────────

describe("findOrCreateUser — Case 3: new user creation", () => {
  it("creates a new user when there is no googleId or email match", async () => {
    const result = await findOrCreateUser(GOOGLE_ID, VERIFIED_EMAIL, "Brand New");

    expect(await User.countDocuments()).toBe(1);
    expect(result.googleId).toBe(GOOGLE_ID);
    expect(result.name).toBe("Brand New");
  });

  it("new user has isProfileComplete=false and passwordHash=null", async () => {
    const result = await findOrCreateUser(GOOGLE_ID, VERIFIED_EMAIL, "New User");

    expect(result.isProfileComplete).toBe(false);
    expect(result.passwordHash).toBeNull();
  });

  it("stores a verified email on new users", async () => {
    const result = await findOrCreateUser(GOOGLE_ID, VERIFIED_EMAIL, "New User");

    expect(result.email).toBe("alice@example.com");
  });

  it("stores null email when the email is unverified", async () => {
    const result = await findOrCreateUser(GOOGLE_ID, UNVERIFIED_EMAIL, "New User");

    expect(result.email).toBeNull();
  });

  it("stores null email when emailObj is null (no email scope)", async () => {
    const result = await findOrCreateUser(GOOGLE_ID, null, "New User");

    expect(result.email).toBeNull();
  });

  it("stores null email when verified field is missing", async () => {
    const result = await findOrCreateUser(GOOGLE_ID, EMAIL_NO_VERIFIED_FIELD, "New User");

    expect(result.email).toBeNull();
  });

  it("new user has placeholder role=investor (overwritten in completeProfile)", async () => {
    const result = await findOrCreateUser(GOOGLE_ID, VERIFIED_EMAIL, "New User");

    expect(result.role).toBe("investor");
  });
});
