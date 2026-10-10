const User = require("../models/User");
const Transaction = require("../models/Transaction");
const { sendSuccess, sendError } = require("../utils/response");
const { depositSchema, validate } = require("../validators/investment.validator");

/**
 * POST /api/wallet/deposit
 * Investor only. Simulated deposit — increments walletBalance and records
 * a transaction. Maximum ₹1,00,000 per deposit.
 */
async function deposit(req, res, next) {
  try {
    const { data, errors } = validate(depositSchema, req.body);
    if (errors) return sendError(res, 400, "Validation failed", errors);

    // $inc is atomic — safe even under concurrent requests
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $inc: { walletBalance: data.amount } },
      { new: true, runValidators: true }
    );

    if (!user) return sendError(res, 404, "User not found");

    await Transaction.create({
      userId: req.user.userId,
      type: "deposit",
      amount: data.amount,
      referenceId: null,
    });

    return sendSuccess(res, 200, "Deposit successful", {
      walletBalance: user.walletBalance,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/wallet/balance
 * Investor only. Returns the current wallet balance.
 */
async function getBalance(req, res, next) {
  try {
    const user = await User.findById(req.user.userId).select("walletBalance");
    if (!user) return sendError(res, 404, "User not found");

    return sendSuccess(res, 200, "Balance retrieved successfully", {
      walletBalance: user.walletBalance,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/wallet/transactions
 * Investor only. Returns the investor's full transaction history.
 */
async function getTransactions(req, res, next) {
  try {
    const transactions = await Transaction.find({ userId: req.user.userId }).sort({
      createdAt: -1,
    });

    return sendSuccess(res, 200, "Transactions retrieved successfully", transactions);
  } catch (err) {
    next(err);
  }
}

module.exports = { deposit, getBalance, getTransactions };
