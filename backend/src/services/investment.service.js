const mongoose = require("mongoose");
const User = require("../models/User");
const Opportunity = require("../models/Opportunity");
const Investment = require("../models/Investment");
const Transaction = require("../models/Transaction");

/**
 * Execute an investment atomically inside a MongoDB multi-document transaction.
 *
 * Validation order (all checks run before any write):
 *  1. Opportunity exists, is active, and deadline has not passed.
 *  2. Amount >= opportunity.minInvestment.
 *  3. Amount does not exceed remaining target (targetAmount - raisedAmount).
 *  4. Investor has sufficient wallet balance.
 *
 * Writes (all inside one session transaction):
 *  a. Deduct amount from investor.walletBalance.
 *  b. Increment opportunity.raisedAmount.
 *  c. Close opportunity if fully funded.
 *  d. Create Investment document.
 *  e. Create Transaction document (type: "investment").
 *
 * The session uses findOneAndUpdate with $inc for the wallet and raisedAmount
 * writes, which are atomic at the document level and safe under concurrent
 * requests within the same transaction.
 *
 * @param {string} investorId
 * @param {string} opportunityId
 * @param {number} amount
 * @returns {Promise<{ investment: Investment, transaction: Transaction }>}
 */
async function executeInvestment(investorId, opportunityId, amount) {
  // ── Pre-transaction validation (no writes yet) ────────────────────────────

  const opportunity = await Opportunity.findById(opportunityId);

  if (!opportunity) {
    const err = new Error("Opportunity not found");
    err.statusCode = 404;
    throw err;
  }

  if (opportunity.status !== "active") {
    const err = new Error("Opportunity is not open for investment");
    err.statusCode = 409;
    throw err;
  }

  if (new Date() > opportunity.deadline) {
    const err = new Error("Opportunity deadline has passed");
    err.statusCode = 409;
    throw err;
  }

  if (amount < opportunity.minInvestment) {
    const err = new Error(
      `Minimum investment for this opportunity is ₹${opportunity.minInvestment}`
    );
    err.statusCode = 400;
    throw err;
  }

  const remaining = opportunity.targetAmount - opportunity.raisedAmount;
  if (amount > remaining) {
    const err = new Error(
      `Investment exceeds the remaining target. Maximum allowed: ₹${remaining}`
    );
    err.statusCode = 400;
    throw err;
  }

  const investor = await User.findById(investorId);
  if (!investor) {
    const err = new Error("Investor account not found");
    err.statusCode = 404;
    throw err;
  }

  if (investor.walletBalance < amount) {
    const err = new Error("Insufficient wallet balance");
    err.statusCode = 409;
    throw err;
  }

  // ── Atomic writes inside a MongoDB session transaction ────────────────────

  const session = await mongoose.startSession();
  try {
    let investment;
    let txnRecord;

    await session.withTransaction(async () => {
      // a. Deduct from investor wallet — atomic $inc prevents race conditions
      const updatedInvestor = await User.findOneAndUpdate(
        { _id: investorId, walletBalance: { $gte: amount } },
        { $inc: { walletBalance: -amount } },
        { new: true, session }
      );

      if (!updatedInvestor) {
        // Balance dropped between our check and the write (concurrent request)
        const err = new Error("Insufficient wallet balance");
        err.statusCode = 409;
        throw err;
      }

      // b & c. Increment raisedAmount and conditionally close the opportunity
      const newRaisedAmount = opportunity.raisedAmount + amount;
      const shouldClose = newRaisedAmount >= opportunity.targetAmount;

      const updateFields = { $inc: { raisedAmount: amount } };
      if (shouldClose) {
        updateFields.$set = { status: "closed" };
      }

      await Opportunity.findOneAndUpdate(
        { _id: opportunityId },
        updateFields,
        { session }
      );

      // d. Create Investment record
      [investment] = await Investment.create(
        [{ investorId, opportunityId, amount }],
        { session }
      );

      // e. Create Transaction record
      [txnRecord] = await Transaction.create(
        [{ userId: investorId, type: "investment", amount, referenceId: investment._id }],
        { session }
      );
    });

    return { investment, transaction: txnRecord };
  } finally {
    await session.endSession();
  }
}

module.exports = { executeInvestment };
