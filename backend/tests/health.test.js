const request = require("supertest");

// Set env vars before importing app so Zod validation passes
process.env.NODE_ENV = "test";
process.env.MONGO_URI = "mongodb://localhost:27017/investmate_test";
process.env.JWT_SECRET = "test_secret_for_jest_at_least_16_chars";

const app = require("../src/app");

describe("GET /api/health", () => {
  it("returns 200 with server status", async () => {
    const res = await request(app).get("/api/health");

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Server is running");
    expect(res.body.data).toHaveProperty("environment");
    expect(res.body.data).toHaveProperty("timestamp");
  });

  it("returns 404 for unknown routes", async () => {
    const res = await request(app).get("/api/unknown");

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
