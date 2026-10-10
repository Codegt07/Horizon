const { Router } = require("express");

const {
  createInvestment,
  getMyInvestments,
  getOpportunityInvestments,
} = require("../controllers/investment.controller");
const { authenticate } = require("../middlewares/authenticate");
const { requireRole } = require("../middlewares/requireRole");

const router = Router();

router.use(authenticate);

// ── Investor routes ───────────────────────────────────────────────────────────
router.post("/",    requireRole("investor"),    createInvestment);
router.get("/my",   requireRole("investor"),    getMyInvestments);

// ── Fundraiser route ──────────────────────────────────────────────────────────
// /my must come before /:id so it is not treated as an ID parameter
router.get("/opportunity/:id", requireRole("fundraiser"), getOpportunityInvestments);

module.exports = router;
