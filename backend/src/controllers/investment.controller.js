const Investment = require("../models/Investment");
const { executeInvestment } = require("../services/investment.service");
const { getOwnedOpportunity } = require("../services/opportunity.service");
const { sendSuccess, sendError } = require("../utils/response");
const { investmentSchema, validate } = require("../validators/investment.validator");

async function createInvestment(req, res, next) {
  try {
    const { data, errors } = validate(investmentSchema, req.body);
    if (errors) return sendError(res, 400, "Validation failed", errors);

    const { investment, transaction } = await executeInvestment(
      req.user.userId,
      data.opportunityId,
      data.amount
    );

    return sendSuccess(res, 201, "Investment created successfully", {
      investment,
      transaction,
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, err.statusCode, err.message);
    next(err);
  }
}

async function getMyInvestments(req, res, next) {
  try {
    const investments = await Investment.find({ investorId: req.user.userId })
      .populate("opportunityId", "title targetAmount raisedAmount status deadline")
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, "Portfolio retrieved successfully", investments);
  } catch (err) {
    next(err);
  }
}

async function getOpportunityInvestments(req, res, next) {
  try {
    await getOwnedOpportunity(req.params.id, req.user.userId);

    const investments = await Investment.find({ opportunityId: req.params.id })
      .populate("investorId", "name email")
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, "Investments retrieved successfully", investments);
  } catch (err) {
    if (err.statusCode) return sendError(res, err.statusCode, err.message);
    next(err);
  }
}

module.exports = { createInvestment, getMyInvestments, getOpportunityInvestments };
