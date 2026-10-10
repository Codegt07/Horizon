const Opportunity = require("../models/Opportunity");
const { getOwnedOpportunity } = require("../services/opportunity.service");
const { sendSuccess, sendError } = require("../utils/response");
const {
  opportunitySchema,
  opportunityUpdateSchema,
  validate,
} = require("../validators/opportunity.validator");

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
      fundraiserId: req.user.userId,
    });

    return sendSuccess(res, 201, "Opportunity created successfully", opportunity);
  } catch (err) {
    next(err);
  }
}

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

async function getOpportunity(req, res, next) {
  try {
    const opportunity = await Opportunity.findById(req.params.id);

    if (!opportunity) {
      return sendError(res, 404, "Opportunity not found");
    }

    const { role, userId } = req.user;

    if (role === "investor" && opportunity.status !== "active") {
      return sendError(res, 404, "Opportunity not found");
    }

    if (role === "fundraiser" && opportunity.fundraiserId.toString() !== userId) {
      return sendError(res, 404, "Opportunity not found");
    }

    return sendSuccess(res, 200, "Opportunity retrieved successfully", opportunity);
  } catch (err) {
    next(err);
  }
}

async function updateOpportunity(req, res, next) {
  try {
    const { data, errors } = validate(opportunityUpdateSchema, req.body);
    if (errors) return sendError(res, 400, "Validation failed", errors);

    const opportunity = await getOwnedOpportunity(req.params.id, req.user.userId);

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
