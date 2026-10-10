/**
 * Phase 5 — Investment + Wallet integration tests.
 *
 * Uses MongoMemoryReplSet (instead of MongoMemoryServer) because MongoDB
 * multi-document transactions require a replica set.
 */

const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const request = require("supertest");
const jwt = require("jsonwebtoken");

process.env.NODE_ENV = "test";
process.env.MONGO_URI = "placeholder";
process.env.JWT_SECRET = "test_secret_for_jest_at_least_16_chars";

const app = require("../src/app");
const User = require("../src/models/User");
const Opportunity = require("../src/models/Opportunity");
const Investment = require("../src/models/Investment");
const Transaction = require("../src/models/Transaction");

let replSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Opportunity.deleteMany({}),
    Investment.deleteMany({}),
    Transaction.deleteMany({}),
  ]);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAuthCookie(userId, role) {
  const token = jwt.sign(
    { userId: userId.toString(), role, isProfileComplete: true, type: "auth" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
  return [`token=${token}; Path=/; HttpOnly`];
}

function createUser(role = "investor", walletBalance = 0) {
  return User.create({
    name: role === "investor" ? "Ivan Investor" : "Frank Fundraiser",
    email: `${role}-${Date.now()}-${Math.random()}@example.com`,
    passwordHash: null,
    googleId: `google-${Date.now()}-${Math.random()}`,
    role,
    isProfileComplete: true,
    walletBalance,
  });
}

function createOpportunity(fundraiserId, overrides = {}) {
  return Opportunity.create({
    title: "Test Fund",
    description: "A test funding opportunity.",
    targetAmount: 100000,
    minInvestment: 1000,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: "active",
    raisedAmount: 0,
    fundraiserId,
    ...overrides,
  });
}

// ── POST /api/wallet/deposit ──────────────────────────────────────────────────

describe("POST /api/wallet/deposit", () => {
  it("investor can deposit and balance is updated", async () => {
    const investor = await createUser("investor", 0);
    const cookie = makeAuthCookie(investor._id, "investor");

    const res = await request(app)
      .post("/api/wallet/deposit")
      .set("Cookie", cookie)
      .send({ amount: 50000 });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.walletBalance).toBe(50000);

    const updated = await User.findById(investor._id);
    expect(updated.walletBalance).toBe(50000);
  });

  it("deposit creates a transaction record", async () => {
    const investor = await createUser("investor", 0);
    const cookie = makeAuthCookie(investor._id, "investor");

    await request(app)
      .post("/api/wallet/deposit")
      .set("Cookie", cookie)
      .send({ amount: 10000 });

    const txn = await Transaction.findOne({ userId: investor._id });
    expect(txn).not.toBeNull();
    expect(txn.type).toBe("deposit");
    expect(txn.amount).toBe(10000);
    expect(txn.referenceId).toBeNull();
  });

  it("rejects deposit above ₹1,00,000", async () => {
    const investor = await createUser("investor", 0);
    const cookie = makeAuthCookie(investor._id, "investor");

    const res = await request(app)
      .post("/api/wallet/deposit")
      .set("Cookie", cookie)
      .send({ amount: 100001 });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors.some((e) => e.field === "amount")).toBe(true);
  });

  it("accepts the maximum allowed deposit of ₹1,00,000 exactly", async () => {
    const investor = await createUser("investor", 0);
    const cookie = makeAuthCookie(investor._id, "investor");

    const res = await request(app)
      .post("/api/wallet/deposit")
      .set("Cookie", cookie)
      .send({ amount: 100000 });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.walletBalance).toBe(100000);
  });

  it("rejects zero amount", async () => {
    const investor = await createUser("investor", 0);
    const cookie = makeAuthCookie(investor._id, "investor");

    const res = await request(app)
      .post("/api/wallet/deposit")
      .set("Cookie", cookie)
      .send({ amount: 0 });

    expect(res.statusCode).toBe(400);
  });

  it("rejects negative amount", async () => {
    const investor = await createUser("investor", 0);
    const cookie = makeAuthCookie(investor._id, "investor");

    const res = await request(app)
      .post("/api/wallet/deposit")
      .set("Cookie", cookie)
      .send({ amount: -500 });

    expect(res.statusCode).toBe(400);
  });

  it("rejects missing amount", async () => {
    const investor = await createUser("investor", 0);
    const cookie = makeAuthCookie(investor._id, "investor");

    const res = await request(app)
      .post("/api/wallet/deposit")
      .set("Cookie", cookie)
      .send({});

    expect(res.statusCode).toBe(400);
  });

  it("fundraiser cannot deposit", async () => {
    const fundraiser = await createUser("fundraiser", 0);
    const cookie = makeAuthCookie(fundraiser._id, "fundraiser");

    const res = await request(app)
      .post("/api/wallet/deposit")
      .set("Cookie", cookie)
      .send({ amount: 1000 });

    expect(res.statusCode).toBe(403);
  });

  it("unauthenticated request returns 401", async () => {
    const res = await request(app)
      .post("/api/wallet/deposit")
      .send({ amount: 1000 });

    expect(res.statusCode).toBe(401);
  });
});

// ── GET /api/wallet/balance ───────────────────────────────────────────────────

describe("GET /api/wallet/balance", () => {
  it("returns investor's current balance", async () => {
    const investor = await createUser("investor", 75000);
    const cookie = makeAuthCookie(investor._id, "investor");

    const res = await request(app)
      .get("/api/wallet/balance")
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.walletBalance).toBe(75000);
  });

  it("fundraiser cannot access wallet balance", async () => {
    const fundraiser = await createUser("fundraiser");
    const cookie = makeAuthCookie(fundraiser._id, "fundraiser");

    const res = await request(app)
      .get("/api/wallet/balance")
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(403);
  });

  it("unauthenticated request returns 401", async () => {
    const res = await request(app).get("/api/wallet/balance");
    expect(res.statusCode).toBe(401);
  });
});

// ── GET /api/wallet/transactions ──────────────────────────────────────────────

describe("GET /api/wallet/transactions", () => {
  it("returns investor's transaction history", async () => {
    const investor = await createUser("investor", 0);
    const cookie = makeAuthCookie(investor._id, "investor");

    await Transaction.create({ userId: investor._id, type: "deposit", amount: 5000 });
    await Transaction.create({ userId: investor._id, type: "deposit", amount: 3000 });

    const res = await request(app)
      .get("/api/wallet/transactions")
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it("investor only sees their own transactions", async () => {
    const inv1 = await createUser("investor", 0);
    const inv2 = await createUser("investor", 0);

    await Transaction.create({ userId: inv1._id, type: "deposit", amount: 5000 });
    await Transaction.create({ userId: inv2._id, type: "deposit", amount: 9000 });

    const cookie = makeAuthCookie(inv1._id, "investor");
    const res = await request(app)
      .get("/api/wallet/transactions")
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].amount).toBe(5000);
  });

  it("returns empty array when no transactions exist", async () => {
    const investor = await createUser("investor", 0);
    const cookie = makeAuthCookie(investor._id, "investor");

    const res = await request(app)
      .get("/api/wallet/transactions")
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("unauthenticated request returns 401", async () => {
    const res = await request(app).get("/api/wallet/transactions");
    expect(res.statusCode).toBe(401);
  });
});

// ── POST /api/investments ─────────────────────────────────────────────────────

describe("POST /api/investments", () => {
  it("investor can invest successfully", async () => {
    const fundraiser = await createUser("fundraiser");
    const investor = await createUser("investor", 50000);
    const opp = await createOpportunity(fundraiser._id);
    const cookie = makeAuthCookie(investor._id, "investor");

    const res = await request(app)
      .post("/api/investments")
      .set("Cookie", cookie)
      .send({ opportunityId: opp._id.toString(), amount: 5000 });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.investment.amount).toBe(5000);
    expect(res.body.data.transaction.type).toBe("investment");
  });

  it("wallet balance is deducted after investment", async () => {
    const fundraiser = await createUser("fundraiser");
    const investor = await createUser("investor", 50000);
    const opp = await createOpportunity(fundraiser._id);
    const cookie = makeAuthCookie(investor._id, "investor");

    await request(app)
      .post("/api/investments")
      .set("Cookie", cookie)
      .send({ opportunityId: opp._id.toString(), amount: 5000 });

    const updated = await User.findById(investor._id);
    expect(updated.walletBalance).toBe(45000);
  });

  it("opportunity raisedAmount is incremented after investment", async () => {
    const fundraiser = await createUser("fundraiser");
    const investor = await createUser("investor", 50000);
    const opp = await createOpportunity(fundraiser._id);
    const cookie = makeAuthCookie(investor._id, "investor");

    await request(app)
      .post("/api/investments")
      .set("Cookie", cookie)
      .send({ opportunityId: opp._id.toString(), amount: 5000 });

    const updated = await Opportunity.findById(opp._id);
    expect(updated.raisedAmount).toBe(5000);
  });

  it("investment and transaction records are created", async () => {
    const fundraiser = await createUser("fundraiser");
    const investor = await createUser("investor", 50000);
    const opp = await createOpportunity(fundraiser._id);
    const cookie = makeAuthCookie(investor._id, "investor");

    await request(app)
      .post("/api/investments")
      .set("Cookie", cookie)
      .send({ opportunityId: opp._id.toString(), amount: 5000 });

    const investment = await Investment.findOne({ investorId: investor._id });
    const txn = await Transaction.findOne({ userId: investor._id, type: "investment" });

    expect(investment).not.toBeNull();
    expect(txn).not.toBeNull();
    expect(txn.referenceId.toString()).toBe(investment._id.toString());
  });

  it("opportunity closes automatically when fully funded", async () => {
    const fundraiser = await createUser("fundraiser");
    const investor = await createUser("investor", 200000);
    const opp = await createOpportunity(fundraiser._id, {
      targetAmount: 10000,
      minInvestment: 1000,
    });
    const cookie = makeAuthCookie(investor._id, "investor");

    const res = await request(app)
      .post("/api/investments")
      .set("Cookie", cookie)
      .send({ opportunityId: opp._id.toString(), amount: 10000 });

    expect(res.statusCode).toBe(201);
    const updated = await Opportunity.findById(opp._id);
    expect(updated.status).toBe("closed");
    expect(updated.raisedAmount).toBe(10000);
  });

  it("rejects investment with insufficient wallet balance", async () => {
    const fundraiser = await createUser("fundraiser");
    const investor = await createUser("investor", 500); // only 500
    const opp = await createOpportunity(fundraiser._id);
    const cookie = makeAuthCookie(investor._id, "investor");

    const res = await request(app)
      .post("/api/investments")
      .set("Cookie", cookie)
      .send({ opportunityId: opp._id.toString(), amount: 5000 });

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/insufficient wallet balance/i);
  });

  it("rejects investment below minimum", async () => {
    const fundraiser = await createUser("fundraiser");
    const investor = await createUser("investor", 50000);
    const opp = await createOpportunity(fundraiser._id, { minInvestment: 5000 });
    const cookie = makeAuthCookie(investor._id, "investor");

    const res = await request(app)
      .post("/api/investments")
      .set("Cookie", cookie)
      .send({ opportunityId: opp._id.toString(), amount: 500 });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/minimum investment/i);
  });

  it("rejects investment that exceeds remaining target", async () => {
    const fundraiser = await createUser("fundraiser");
    const investor = await createUser("investor", 200000);
    const opp = await createOpportunity(fundraiser._id, {
      targetAmount: 10000,
      raisedAmount: 8000,
      minInvestment: 100,
    });
    const cookie = makeAuthCookie(investor._id, "investor");

    const res = await request(app)
      .post("/api/investments")
      .set("Cookie", cookie)
      .send({ opportunityId: opp._id.toString(), amount: 5000 });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/remaining target/i);
  });

  it("rejects investment in a draft opportunity", async () => {
    const fundraiser = await createUser("fundraiser");
    const investor = await createUser("investor", 50000);
    const opp = await createOpportunity(fundraiser._id, { status: "draft" });
    const cookie = makeAuthCookie(investor._id, "investor");

    const res = await request(app)
      .post("/api/investments")
      .set("Cookie", cookie)
      .send({ opportunityId: opp._id.toString(), amount: 5000 });

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/not open for investment/i);
  });

  it("rejects investment in a closed opportunity", async () => {
    const fundraiser = await createUser("fundraiser");
    const investor = await createUser("investor", 50000);
    const opp = await createOpportunity(fundraiser._id, { status: "closed" });
    const cookie = makeAuthCookie(investor._id, "investor");

    const res = await request(app)
      .post("/api/investments")
      .set("Cookie", cookie)
      .send({ opportunityId: opp._id.toString(), amount: 5000 });

    expect(res.statusCode).toBe(409);
  });

  it("rejects investment in an opportunity past its deadline", async () => {
    const fundraiser = await createUser("fundraiser");
    const investor = await createUser("investor", 50000);
    const opp = await createOpportunity(fundraiser._id, {
      deadline: new Date(Date.now() - 1000), // 1 second in the past
    });
    const cookie = makeAuthCookie(investor._id, "investor");

    const res = await request(app)
      .post("/api/investments")
      .set("Cookie", cookie)
      .send({ opportunityId: opp._id.toString(), amount: 5000 });

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/deadline/i);
  });

  it("rejects investment with non-existent opportunity ID", async () => {
    const investor = await createUser("investor", 50000);
    const fakeId = new mongoose.Types.ObjectId();
    const cookie = makeAuthCookie(investor._id, "investor");

    const res = await request(app)
      .post("/api/investments")
      .set("Cookie", cookie)
      .send({ opportunityId: fakeId.toString(), amount: 5000 });

    expect(res.statusCode).toBe(404);
  });

  it("fundraiser cannot invest", async () => {
    const fundraiser = await createUser("fundraiser");
    const opp = await createOpportunity(fundraiser._id);
    const cookie = makeAuthCookie(fundraiser._id, "fundraiser");

    const res = await request(app)
      .post("/api/investments")
      .set("Cookie", cookie)
      .send({ opportunityId: opp._id.toString(), amount: 5000 });

    expect(res.statusCode).toBe(403);
  });

  it("unauthenticated request returns 401", async () => {
    const fundraiser = await createUser("fundraiser");
    const opp = await createOpportunity(fundraiser._id);

    const res = await request(app)
      .post("/api/investments")
      .send({ opportunityId: opp._id.toString(), amount: 5000 });

    expect(res.statusCode).toBe(401);
  });

  it("returns 400 for missing required fields", async () => {
    const investor = await createUser("investor", 50000);
    const cookie = makeAuthCookie(investor._id, "investor");

    const res = await request(app)
      .post("/api/investments")
      .set("Cookie", cookie)
      .send({});

    expect(res.statusCode).toBe(400);
  });
});

// ── GET /api/investments/my ───────────────────────────────────────────────────

describe("GET /api/investments/my", () => {
  it("returns investor's portfolio", async () => {
    const fundraiser = await createUser("fundraiser");
    const investor = await createUser("investor", 100000);
    const opp = await createOpportunity(fundraiser._id);

    await Investment.create({
      investorId: investor._id,
      opportunityId: opp._id,
      amount: 5000,
    });

    const cookie = makeAuthCookie(investor._id, "investor");
    const res = await request(app)
      .get("/api/investments/my")
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].amount).toBe(5000);
  });

  it("portfolio is isolated — investor only sees their own investments", async () => {
    const fundraiser = await createUser("fundraiser");
    const inv1 = await createUser("investor", 100000);
    const inv2 = await createUser("investor", 100000);
    const opp = await createOpportunity(fundraiser._id);

    await Investment.create({ investorId: inv1._id, opportunityId: opp._id, amount: 5000 });
    await Investment.create({ investorId: inv2._id, opportunityId: opp._id, amount: 3000 });

    const cookie = makeAuthCookie(inv1._id, "investor");
    const res = await request(app)
      .get("/api/investments/my")
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].amount).toBe(5000);
  });

  it("fundraiser cannot access investor portfolio endpoint", async () => {
    const fundraiser = await createUser("fundraiser");
    const cookie = makeAuthCookie(fundraiser._id, "fundraiser");

    const res = await request(app)
      .get("/api/investments/my")
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(403);
  });

  it("unauthenticated request returns 401", async () => {
    const res = await request(app).get("/api/investments/my");
    expect(res.statusCode).toBe(401);
  });
});

// ── GET /api/investments/opportunity/:id ──────────────────────────────────────

describe("GET /api/investments/opportunity/:id", () => {
  it("owning fundraiser can view investors in their opportunity", async () => {
    const fundraiser = await createUser("fundraiser");
    const investor = await createUser("investor", 100000);
    const opp = await createOpportunity(fundraiser._id);

    await Investment.create({ investorId: investor._id, opportunityId: opp._id, amount: 5000 });

    const cookie = makeAuthCookie(fundraiser._id, "fundraiser");
    const res = await request(app)
      .get(`/api/investments/opportunity/${opp._id}`)
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("another fundraiser cannot view investments for someone else's opportunity", async () => {
    const f1 = await createUser("fundraiser");
    const f2 = await createUser("fundraiser");
    const opp = await createOpportunity(f1._id);

    const cookie = makeAuthCookie(f2._id, "fundraiser");
    const res = await request(app)
      .get(`/api/investments/opportunity/${opp._id}`)
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(403);
  });

  it("investor cannot access opportunity investment list", async () => {
    const fundraiser = await createUser("fundraiser");
    const investor = await createUser("investor");
    const opp = await createOpportunity(fundraiser._id);

    const cookie = makeAuthCookie(investor._id, "investor");
    const res = await request(app)
      .get(`/api/investments/opportunity/${opp._id}`)
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(403);
  });

  it("returns 404 for a non-existent opportunity", async () => {
    const fundraiser = await createUser("fundraiser");
    const fakeId = new mongoose.Types.ObjectId();
    const cookie = makeAuthCookie(fundraiser._id, "fundraiser");

    const res = await request(app)
      .get(`/api/investments/opportunity/${fakeId}`)
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(404);
  });

  it("unauthenticated request returns 401", async () => {
    const fundraiser = await createUser("fundraiser");
    const opp = await createOpportunity(fundraiser._id);

    const res = await request(app).get(`/api/investments/opportunity/${opp._id}`);
    expect(res.statusCode).toBe(401);
  });
});

// ── Atomicity / rollback ──────────────────────────────────────────────────────

describe("Investment atomicity", () => {
  it("no records are written when wallet balance is insufficient (rollback)", async () => {
    const fundraiser = await createUser("fundraiser");
    const investor = await createUser("investor", 100); // not enough
    const opp = await createOpportunity(fundraiser._id);
    const cookie = makeAuthCookie(investor._id, "investor");

    await request(app)
      .post("/api/investments")
      .set("Cookie", cookie)
      .send({ opportunityId: opp._id.toString(), amount: 5000 });

    // Nothing should have been written
    expect(await Investment.countDocuments()).toBe(0);
    expect(await Transaction.countDocuments()).toBe(0);

    const unchangedInvestor = await User.findById(investor._id);
    expect(unchangedInvestor.walletBalance).toBe(100);

    const unchangedOpp = await Opportunity.findById(opp._id);
    expect(unchangedOpp.raisedAmount).toBe(0);
  });

  it("concurrent investments cannot exceed wallet balance", async () => {
    const fundraiser = await createUser("fundraiser");
    const investor = await createUser("investor", 5000);
    const opp = await createOpportunity(fundraiser._id, {
      targetAmount: 200000,
      minInvestment: 1000,
    });
    const cookie = makeAuthCookie(investor._id, "investor");

    // Fire two requests for 5000 each simultaneously — only one should succeed
    const [r1, r2] = await Promise.all([
      request(app)
        .post("/api/investments")
        .set("Cookie", cookie)
        .send({ opportunityId: opp._id.toString(), amount: 5000 }),
      request(app)
        .post("/api/investments")
        .set("Cookie", cookie)
        .send({ opportunityId: opp._id.toString(), amount: 5000 }),
    ]);

    const successes = [r1, r2].filter((r) => r.statusCode === 201);
    const failures  = [r1, r2].filter((r) => r.statusCode !== 201);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);

    const finalInvestor = await User.findById(investor._id);
    expect(finalInvestor.walletBalance).toBe(0);

    const totalInvested = await Investment.aggregate([
      { $match: { investorId: investor._id } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    expect(totalInvested[0]?.total ?? 0).toBe(5000);
  });
});
