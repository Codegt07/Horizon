const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const jwt = require("jsonwebtoken");

process.env.NODE_ENV = "test";
process.env.MONGO_URI = "placeholder";
process.env.JWT_SECRET = "test_secret_for_jest_at_least_16_chars";

const app = require("../src/app");
const User = require("../src/models/User");
const Opportunity = require("../src/models/Opportunity");

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
  await Opportunity.deleteMany({});
  await User.deleteMany({});
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Mint a full auth cookie directly (avoids bcrypt overhead in every test) */
function makeAuthCookie(userId, role) {
  const token = jwt.sign(
    { userId: userId.toString(), role, isProfileComplete: true, type: "auth" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
  return [`token=${token}; Path=/; HttpOnly`];
}

/** Create a User document directly in the DB */
function createUser(role = "fundraiser", overrides = {}) {
  return User.create({
    name: role === "fundraiser" ? "Frank Fundraiser" : "Ivan Investor",
    email: `${role}-${Date.now()}@example.com`,
    passwordHash: null,
    googleId: `google-${Date.now()}`,
    role,
    isProfileComplete: true,
    walletBalance: 0,
    ...overrides,
  });
}

/** Create an Opportunity document directly in the DB */
function createOpportunity(fundraiserId, overrides = {}) {
  return Opportunity.create({
    title: "Test Opportunity",
    description: "A great investment opportunity for testing purposes.",
    targetAmount: 100000,
    minInvestment: 1000,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    status: "draft",
    fundraiserId,
    ...overrides,
  });
}

/** Valid opportunity payload for POST/PATCH requests */
const VALID_PAYLOAD = {
  title: "Green Energy Fund",
  description: "Investing in renewable energy sources across the country.",
  targetAmount: 500000,
  minInvestment: 5000,
  deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  status: "draft",
};

// ── POST /api/opportunities ───────────────────────────────────────────────────

describe("POST /api/opportunities", () => {
  it("fundraiser can create an opportunity and gets 201", async () => {
    const fundraiser = await createUser("fundraiser");
    const cookie = makeAuthCookie(fundraiser._id, "fundraiser");

    const res = await request(app)
      .post("/api/opportunities")
      .set("Cookie", cookie)
      .send(VALID_PAYLOAD);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe(VALID_PAYLOAD.title);
    expect(res.body.data.status).toBe("draft");
  });

  it("sets fundraiserId from the authenticated user, not the request body", async () => {
    const fundraiser = await createUser("fundraiser");
    const cookie = makeAuthCookie(fundraiser._id, "fundraiser");
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .post("/api/opportunities")
      .set("Cookie", cookie)
      .send({ ...VALID_PAYLOAD, fundraiserId: fakeId });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.fundraiserId).toBe(fundraiser._id.toString());
    expect(res.body.data.fundraiserId).not.toBe(fakeId);
  });

  it("initialises raisedAmount to 0 regardless of request body", async () => {
    const fundraiser = await createUser("fundraiser");
    const cookie = makeAuthCookie(fundraiser._id, "fundraiser");

    const res = await request(app)
      .post("/api/opportunities")
      .set("Cookie", cookie)
      .send({ ...VALID_PAYLOAD, raisedAmount: 99999 });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.raisedAmount).toBe(0);
  });

  it("returns 403 when an investor tries to create an opportunity", async () => {
    const investor = await createUser("investor");
    const cookie = makeAuthCookie(investor._id, "investor");

    const res = await request(app)
      .post("/api/opportunities")
      .set("Cookie", cookie)
      .send(VALID_PAYLOAD);

    expect(res.statusCode).toBe(403);
  });

  it("returns 401 for unauthenticated requests", async () => {
    const res = await request(app)
      .post("/api/opportunities")
      .send(VALID_PAYLOAD);

    expect(res.statusCode).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    const fundraiser = await createUser("fundraiser");
    const cookie = makeAuthCookie(fundraiser._id, "fundraiser");

    const res = await request(app)
      .post("/api/opportunities")
      .set("Cookie", cookie)
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it("returns 400 for a negative targetAmount", async () => {
    const fundraiser = await createUser("fundraiser");
    const cookie = makeAuthCookie(fundraiser._id, "fundraiser");

    const res = await request(app)
      .post("/api/opportunities")
      .set("Cookie", cookie)
      .send({ ...VALID_PAYLOAD, targetAmount: -100 });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors.some((e) => e.field === "targetAmount")).toBe(true);
  });

  it("returns 400 for a negative minInvestment", async () => {
    const fundraiser = await createUser("fundraiser");
    const cookie = makeAuthCookie(fundraiser._id, "fundraiser");

    const res = await request(app)
      .post("/api/opportunities")
      .set("Cookie", cookie)
      .send({ ...VALID_PAYLOAD, minInvestment: 0 });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors.some((e) => e.field === "minInvestment")).toBe(true);
  });

  it("returns 400 for a past deadline", async () => {
    const fundraiser = await createUser("fundraiser");
    const cookie = makeAuthCookie(fundraiser._id, "fundraiser");

    const res = await request(app)
      .post("/api/opportunities")
      .set("Cookie", cookie)
      .send({ ...VALID_PAYLOAD, deadline: "2020-01-01" });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors.some((e) => e.field === "deadline")).toBe(true);
  });

  it("returns 400 for an invalid date string", async () => {
    const fundraiser = await createUser("fundraiser");
    const cookie = makeAuthCookie(fundraiser._id, "fundraiser");

    const res = await request(app)
      .post("/api/opportunities")
      .set("Cookie", cookie)
      .send({ ...VALID_PAYLOAD, deadline: "not-a-date" });

    expect(res.statusCode).toBe(400);
  });
});

// ── GET /api/opportunities ────────────────────────────────────────────────────

describe("GET /api/opportunities", () => {
  it("investor sees only active opportunities", async () => {
    const fundraiser = await createUser("fundraiser");
    const investor = await createUser("investor");

    await createOpportunity(fundraiser._id, { status: "draft" });
    await createOpportunity(fundraiser._id, { status: "active" });
    await createOpportunity(fundraiser._id, { status: "closed" });

    const cookie = makeAuthCookie(investor._id, "investor");
    const res = await request(app).get("/api/opportunities").set("Cookie", cookie);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe("active");
  });

  it("fundraiser sees only their own opportunities (all statuses)", async () => {
    const fundraiser1 = await createUser("fundraiser");
    const fundraiser2 = await createUser("fundraiser");

    await createOpportunity(fundraiser1._id, { status: "draft" });
    await createOpportunity(fundraiser1._id, { status: "active" });
    await createOpportunity(fundraiser2._id, { status: "active" }); // another fundraiser's

    const cookie = makeAuthCookie(fundraiser1._id, "fundraiser");
    const res = await request(app).get("/api/opportunities").set("Cookie", cookie);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(2);
    res.body.data.forEach((opp) => {
      expect(opp.fundraiserId).toBe(fundraiser1._id.toString());
    });
  });

  it("returns 401 for unauthenticated requests", async () => {
    const res = await request(app).get("/api/opportunities");
    expect(res.statusCode).toBe(401);
  });

  it("returns an empty array when no opportunities exist", async () => {
    const investor = await createUser("investor");
    const cookie = makeAuthCookie(investor._id, "investor");

    const res = await request(app).get("/api/opportunities").set("Cookie", cookie);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

// ── GET /api/opportunities/:id ────────────────────────────────────────────────

describe("GET /api/opportunities/:id", () => {
  it("investor can fetch an active opportunity by ID", async () => {
    const fundraiser = await createUser("fundraiser");
    const investor = await createUser("investor");
    const opp = await createOpportunity(fundraiser._id, { status: "active" });

    const cookie = makeAuthCookie(investor._id, "investor");
    const res = await request(app)
      .get(`/api/opportunities/${opp._id}`)
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(200);
    expect(res.body.data._id).toBe(opp._id.toString());
  });

  it("investor gets 404 for a draft opportunity", async () => {
    const fundraiser = await createUser("fundraiser");
    const investor = await createUser("investor");
    const opp = await createOpportunity(fundraiser._id, { status: "draft" });

    const cookie = makeAuthCookie(investor._id, "investor");
    const res = await request(app)
      .get(`/api/opportunities/${opp._id}`)
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(404);
  });

  it("fundraiser can fetch their own draft opportunity", async () => {
    const fundraiser = await createUser("fundraiser");
    const opp = await createOpportunity(fundraiser._id, { status: "draft" });

    const cookie = makeAuthCookie(fundraiser._id, "fundraiser");
    const res = await request(app)
      .get(`/api/opportunities/${opp._id}`)
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(200);
    expect(res.body.data._id).toBe(opp._id.toString());
  });

  it("fundraiser gets 404 for another fundraiser's opportunity", async () => {
    const f1 = await createUser("fundraiser");
    const f2 = await createUser("fundraiser");
    const opp = await createOpportunity(f1._id, { status: "active" });

    const cookie = makeAuthCookie(f2._id, "fundraiser");
    const res = await request(app)
      .get(`/api/opportunities/${opp._id}`)
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(404);
  });

  it("returns 404 for a non-existent opportunity ID", async () => {
    const investor = await createUser("investor");
    const fakeId = new mongoose.Types.ObjectId();
    const cookie = makeAuthCookie(investor._id, "investor");

    const res = await request(app)
      .get(`/api/opportunities/${fakeId}`)
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(404);
  });

  it("returns 400 for a malformed opportunity ID", async () => {
    const investor = await createUser("investor");
    const cookie = makeAuthCookie(investor._id, "investor");

    const res = await request(app)
      .get("/api/opportunities/not-an-id")
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(400);
  });

  it("returns 401 for unauthenticated requests", async () => {
    const fundraiser = await createUser("fundraiser");
    const opp = await createOpportunity(fundraiser._id);

    const res = await request(app).get(`/api/opportunities/${opp._id}`);
    expect(res.statusCode).toBe(401);
  });
});

// ── PATCH /api/opportunities/:id ──────────────────────────────────────────────

describe("PATCH /api/opportunities/:id", () => {
  it("owning fundraiser can update their opportunity", async () => {
    const fundraiser = await createUser("fundraiser");
    const opp = await createOpportunity(fundraiser._id);
    const cookie = makeAuthCookie(fundraiser._id, "fundraiser");

    const res = await request(app)
      .patch(`/api/opportunities/${opp._id}`)
      .set("Cookie", cookie)
      .send({ title: "Updated Title" });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe("Updated Title");
  });

  it("another fundraiser cannot update someone else's opportunity", async () => {
    const f1 = await createUser("fundraiser");
    const f2 = await createUser("fundraiser");
    const opp = await createOpportunity(f1._id);
    const cookie = makeAuthCookie(f2._id, "fundraiser");

    const res = await request(app)
      .patch(`/api/opportunities/${opp._id}`)
      .set("Cookie", cookie)
      .send({ title: "Hijacked" });

    expect(res.statusCode).toBe(403);
  });

  it("investor cannot update an opportunity", async () => {
    const fundraiser = await createUser("fundraiser");
    const investor = await createUser("investor");
    const opp = await createOpportunity(fundraiser._id);
    const cookie = makeAuthCookie(investor._id, "investor");

    const res = await request(app)
      .patch(`/api/opportunities/${opp._id}`)
      .set("Cookie", cookie)
      .send({ title: "Investor Update" });

    expect(res.statusCode).toBe(403);
  });

  it("returns 401 for unauthenticated requests", async () => {
    const fundraiser = await createUser("fundraiser");
    const opp = await createOpportunity(fundraiser._id);

    const res = await request(app)
      .patch(`/api/opportunities/${opp._id}`)
      .send({ title: "No Auth" });

    expect(res.statusCode).toBe(401);
  });

  it("returns 400 when the update body is empty", async () => {
    const fundraiser = await createUser("fundraiser");
    const opp = await createOpportunity(fundraiser._id);
    const cookie = makeAuthCookie(fundraiser._id, "fundraiser");

    const res = await request(app)
      .patch(`/api/opportunities/${opp._id}`)
      .set("Cookie", cookie)
      .send({});

    expect(res.statusCode).toBe(400);
  });

  it("does not allow modifying fundraiserId", async () => {
    const fundraiser = await createUser("fundraiser");
    const opp = await createOpportunity(fundraiser._id);
    const cookie = makeAuthCookie(fundraiser._id, "fundraiser");
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .patch(`/api/opportunities/${opp._id}`)
      .set("Cookie", cookie)
      .send({ fundraiserId: fakeId, title: "Valid Update" });

    expect(res.statusCode).toBe(200);
    // fundraiserId must not have changed
    expect(res.body.data.fundraiserId).toBe(fundraiser._id.toString());
  });

  it("does not allow modifying raisedAmount", async () => {
    const fundraiser = await createUser("fundraiser");
    const opp = await createOpportunity(fundraiser._id);
    const cookie = makeAuthCookie(fundraiser._id, "fundraiser");

    const res = await request(app)
      .patch(`/api/opportunities/${opp._id}`)
      .set("Cookie", cookie)
      .send({ raisedAmount: 999999, title: "Valid Update" });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.raisedAmount).toBe(0);
  });

  it("returns 404 for a non-existent opportunity", async () => {
    const fundraiser = await createUser("fundraiser");
    const fakeId = new mongoose.Types.ObjectId();
    const cookie = makeAuthCookie(fundraiser._id, "fundraiser");

    const res = await request(app)
      .patch(`/api/opportunities/${fakeId}`)
      .set("Cookie", cookie)
      .send({ title: "Ghost" });

    expect(res.statusCode).toBe(404);
  });

  it("returns 400 for a malformed opportunity ID", async () => {
    const fundraiser = await createUser("fundraiser");
    const cookie = makeAuthCookie(fundraiser._id, "fundraiser");

    const res = await request(app)
      .patch("/api/opportunities/bad-id")
      .set("Cookie", cookie)
      .send({ title: "Test" });

    expect(res.statusCode).toBe(400);
  });
});

// ── DELETE /api/opportunities/:id ─────────────────────────────────────────────

describe("DELETE /api/opportunities/:id", () => {
  it("owning fundraiser can delete a draft opportunity", async () => {
    const fundraiser = await createUser("fundraiser");
    const opp = await createOpportunity(fundraiser._id, { status: "draft" });
    const cookie = makeAuthCookie(fundraiser._id, "fundraiser");

    const res = await request(app)
      .delete(`/api/opportunities/${opp._id}`)
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(200);
    expect(await Opportunity.findById(opp._id)).toBeNull();
  });

  it("cannot delete an active opportunity", async () => {
    const fundraiser = await createUser("fundraiser");
    const opp = await createOpportunity(fundraiser._id, { status: "active" });
    const cookie = makeAuthCookie(fundraiser._id, "fundraiser");

    const res = await request(app)
      .delete(`/api/opportunities/${opp._id}`)
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(409);
    expect(await Opportunity.findById(opp._id)).not.toBeNull();
  });

  it("cannot delete a closed opportunity", async () => {
    const fundraiser = await createUser("fundraiser");
    const opp = await createOpportunity(fundraiser._id, { status: "closed" });
    const cookie = makeAuthCookie(fundraiser._id, "fundraiser");

    const res = await request(app)
      .delete(`/api/opportunities/${opp._id}`)
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(409);
  });

  it("another fundraiser cannot delete someone else's opportunity", async () => {
    const f1 = await createUser("fundraiser");
    const f2 = await createUser("fundraiser");
    const opp = await createOpportunity(f1._id, { status: "draft" });
    const cookie = makeAuthCookie(f2._id, "fundraiser");

    const res = await request(app)
      .delete(`/api/opportunities/${opp._id}`)
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(403);
    expect(await Opportunity.findById(opp._id)).not.toBeNull();
  });

  it("investor cannot delete an opportunity", async () => {
    const fundraiser = await createUser("fundraiser");
    const investor = await createUser("investor");
    const opp = await createOpportunity(fundraiser._id, { status: "draft" });
    const cookie = makeAuthCookie(investor._id, "investor");

    const res = await request(app)
      .delete(`/api/opportunities/${opp._id}`)
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(403);
  });

  it("returns 401 for unauthenticated requests", async () => {
    const fundraiser = await createUser("fundraiser");
    const opp = await createOpportunity(fundraiser._id, { status: "draft" });

    const res = await request(app).delete(`/api/opportunities/${opp._id}`);
    expect(res.statusCode).toBe(401);
  });

  it("returns 404 for a non-existent opportunity", async () => {
    const fundraiser = await createUser("fundraiser");
    const fakeId = new mongoose.Types.ObjectId();
    const cookie = makeAuthCookie(fundraiser._id, "fundraiser");

    const res = await request(app)
      .delete(`/api/opportunities/${fakeId}`)
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(404);
  });

  it("returns 400 for a malformed opportunity ID", async () => {
    const fundraiser = await createUser("fundraiser");
    const cookie = makeAuthCookie(fundraiser._id, "fundraiser");

    const res = await request(app)
      .delete("/api/opportunities/bad-id")
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(400);
  });
});
