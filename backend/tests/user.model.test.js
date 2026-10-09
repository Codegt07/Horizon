const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const bcrypt = require("bcryptjs");

// Env must be set before any src/ import that loads env.js
process.env.NODE_ENV = "test";
process.env.MONGO_URI = "placeholder"; // overridden by MongoMemoryServer below
process.env.JWT_SECRET = "test_secret_for_jest_at_least_16_chars";

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

function makeUser(overrides = {}) {
  return {
    name: "Test User",
    email: "test@example.com",
    passwordHash: "plainPassword123",
    role: "investor",
    ...overrides,
  };
}

// ── Password hashing middleware ───────────────────────────────────────────────

describe("User model — pre-save password hashing", () => {
  it("hashes passwordHash on first save", async () => {
    const user = await User.create(makeUser());

    // The stored value must not equal the original plain text
    expect(user.passwordHash).not.toBe("plainPassword123");
    // It must be a valid bcrypt hash at cost 12
    expect(user.passwordHash).toMatch(/^\$2[ab]\$12\$/);
  });

  it("the stored hash validates correctly with comparePassword", async () => {
    const user = await User.create(makeUser());

    await expect(user.comparePassword("plainPassword123")).resolves.toBe(true);
    await expect(user.comparePassword("wrongPassword")).resolves.toBe(false);
  });

  it("does not re-hash an already-hashed password on subsequent saves", async () => {
    const user = await User.create(makeUser());
    const hashAfterCreate = user.passwordHash;

    // Save again without touching passwordHash
    user.name = "Updated Name";
    await user.save();

    expect(user.passwordHash).toBe(hashAfterCreate);
  });

  it("re-hashes when passwordHash is explicitly changed", async () => {
    const user = await User.create(makeUser());
    const originalHash = user.passwordHash;

    user.passwordHash = "newPassword456";
    await user.save();

    expect(user.passwordHash).not.toBe(originalHash);
    expect(user.passwordHash).not.toBe("newPassword456");
    await expect(user.comparePassword("newPassword456")).resolves.toBe(true);
  });

  it("skips hashing when passwordHash is null (OAuth user)", async () => {
    const user = await User.create(
      makeUser({ passwordHash: null, googleId: "google-123" })
    );

    expect(user.passwordHash).toBeNull();
  });

  it("uses bcrypt cost factor 12", async () => {
    const user = await User.create(makeUser());

    const rounds = bcrypt.getRounds(user.passwordHash);
    expect(rounds).toBe(12);
  });
});

// ── toJSON serialisation ──────────────────────────────────────────────────────

describe("User model — toJSON", () => {
  it("strips passwordHash from serialised output", async () => {
    const user = await User.create(makeUser());
    const json = user.toJSON();

    expect(json).not.toHaveProperty("passwordHash");
  });

  it("strips googleId from serialised output", async () => {
    const user = await User.create(makeUser());
    const json = user.toJSON();

    expect(json).not.toHaveProperty("googleId");
  });

  it("strips __v from serialised output", async () => {
    const user = await User.create(makeUser());
    const json = user.toJSON();

    expect(json).not.toHaveProperty("__v");
  });

  it("includes expected public fields", async () => {
    const user = await User.create(makeUser());
    const json = user.toJSON();

    expect(json).toHaveProperty("name", "Test User");
    expect(json).toHaveProperty("email", "test@example.com");
    expect(json).toHaveProperty("role", "investor");
    expect(json).toHaveProperty("walletBalance", 0);
    expect(json).toHaveProperty("isProfileComplete", true);
  });
});

// ── Schema validation ─────────────────────────────────────────────────────────

describe("User model — schema validation", () => {
  it("rejects an invalid role", async () => {
    await expect(
      User.create(makeUser({ role: "admin" }))
    ).rejects.toThrow(/Role must be investor or fundraiser/);
  });

  it("rejects a missing email", async () => {
    await expect(
      User.create(makeUser({ email: undefined }))
    ).rejects.toThrow(/Email is required/);
  });

  it("rejects a missing name", async () => {
    await expect(
      User.create(makeUser({ name: undefined }))
    ).rejects.toThrow(/Name is required/);
  });

  it("enforces unique email", async () => {
    await User.create(makeUser());
    await expect(
      User.create(makeUser({ name: "Another User" }))
    ).rejects.toThrow();
  });
});
