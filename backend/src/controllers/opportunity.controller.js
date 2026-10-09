const Opportunity = require("../models/Opportunity");
const { getOwnedOpportunity } = require("../services/opportunity.service");
const { sendSuccess, sendError } = require("../utils/response");
const {
  opportunitySchema,
  opportunityUpdateSchema,
  validate,
} = require("../validators/opportunity.validator");

// ── Create ────────────────────────────────────────────────────────────────────

/**
 * POST /api/opportunities
 * Fundraiser only. Creates a new funding opportunity.
 */
async function createOpportunity(req, res, next) {
  try {
    const { data, errors } = validate(opportunitySchema, req.body);
    if (errors) return sendError(res, 400, "Validation failed", errors);

    const opportunity = await Opportunity.create({
      title: data.title,
      description: data.description,
      targetAmount: data.targetAmount,
      minInvestment: data.minInvestment,
      deadline: new Date(data.deadline),
      status: data.status,
      // Always set from the authenticated user — never trust a client-supplied ID
      fundraiserId: req.user.userId,
    });

    return sendSuccess(res, 201, "Opportunity created successfully", opportunity);
  } catch (err) {
    next(err);
  }
}

// ── List ──────────────────────────────────────────────────────────────────────

/**
 * GET /api/opportunities
 * - Investors see only `active` opportunities.
 * - Fundraisers see all their own opportunities (any status).
 */
async function listOpportunities(req, res, next) {
  try {
    const { role, userId } = req.user;

    const filter =
      role === "fundraiser"
        ? { fundraiserId: userId }
        : { status: "active" };

    const opportunities = await Opportunity.find(filter).sort({ createdAt: -1 });

    return sendSuccess(res, 200, "Opportunities retrieved successfully", opportunities);
  } catch (err) {
    next(err);
  }
}

// ── Get one ───────────────────────────────────────────────────────────────────

/**
 * GET /api/opportunities/:id
 * - Investors can fetch any `active` opportunity by ID.
 * - Fundraisers can fetch their own opportunities regardless of status.
 */
async function getOpportunity(req, res, next) {
  try {
    const opportunity = await Opportunity.findById(req.params.id);

    if (!opportunity) {
      return sendError(res, 404, "Opportunity not found");
    }

    const { role, userId } = req.user;

    // Investors may only see active opportunities
    if (role === "investor" && opportunity.status !== "active") {
      return sendError(res, 404, "Opportunity not found");
    }

    // Fundraisers may only see their own
    if (role === "fundraiser" && opportunity.fundraiserId.toString() !== userId) {
      return sendError(res, 404, "Opportunity not found");
    }

    return sendSuccess(res, 200, "Opportunity retrieved successfully", opportunity);
  } catch (err) {
    next(err);
  }
}

// ── Update ────────────────────────────────────────────────────────────────────

/**
 * PATCH /api/opportunities/:id
 * Fundraiser only. Only the owning fundraiser can update their opportunity.
 * Client may not modify fundraiserId, raisedAmount, or close the opportunity
 * directly (closing is system-managed when raisedAmount reaches targetAmount).
 */
async function updateOpportunity(req, res, next) {
  try {
    const { data, errors } = validate(opportunityUpdateSchema, req.body);
    if (errors) return sendError(res, 400, "Validation failed", errors);

    const opportunity = await getOwnedOpportunity(req.params.id, req.user.userId);

    // Apply only the validated, permitted fields
    const UPDATABLE = ["title", "description", "targetAmount", "minInvestment", "deadline", "status"];
    UPDATABLE.forEach((field) => {
      if (data[field] !== undefined) {
        opportunity[field] = field === "deadline" ? new Date(data[field]) : data[field];
      }
    });

    await opportunity.save();

    return sendSuccess(res, 200, "Opportunity updated successfully", opportunity);
  } catch (err) {
    next(err);
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

/**
 * DELETE /api/opportunities/:id
 * Fundraiser only. Only the owning fundraiser can delete their opportunity.
 * Deletion is restricted to `draft` status — once active or closed (i.e. once
 * investors may have interacted with it), the opportunity cannot be deleted.
 */
async function deleteOpportunity(req, res, next) {
  try {
    const opportunity = await getOwnedOpportunity(req.params.id, req.user.userId);

    if (opportunity.status !== "draft") {
      return sendError(
        res,
        409,
        "Only draft opportunities can be deleted. Close or archive via update instead."
      );
    }

    await opportunity.deleteOne();

    return sendSuccess(res, 200, "Opportunity deleted successfully");
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOpportunity,
  listOpportunities,
  getOpportunity,
  updateOpportunity,
  deleteOpportunity,
};
