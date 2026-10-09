const { Router } = require("express");

const {
  createOpportunity,
  listOpportunities,
  getOpportunity,
  updateOpportunity,
  deleteOpportunity,
} = require("../controllers/opportunity.controller");
const { authenticate } = require("../middlewares/authenticate");
const { requireRole } = require("../middlewares/requireRole");

const router = Router();

// All opportunity routes require authentication
router.use(authenticate);

// ── Reads (both roles) ────────────────────────────────────────────────────────
router.get("/",    listOpportunities);
router.get("/:id", getOpportunity);

// ── Writes (fundraiser only) ──────────────────────────────────────────────────
router.post(  "/",    requireRole("fundraiser"), createOpportunity);
router.patch( "/:id", requireRole("fundraiser"), updateOpportunity);
router.delete("/:id", requireRole("fundraiser"), deleteOpportunity);

module.exports = router;
