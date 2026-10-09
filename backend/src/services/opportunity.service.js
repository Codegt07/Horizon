const Opportunity = require("../models/Opportunity");

/**
 * Fetch a single opportunity by ID and verify that the requesting fundraiser
 * owns it. Returns the document on success.
 *
 * Throws a structured error object so controllers can forward it to
 * errorHandler or respond directly.
 *
 * @param {string} opportunityId  - from req.params.id
 * @param {string} fundraiserId   - from req.user.userId
 * @returns {Promise<import("../models/Opportunity")>}
 */
async function getOwnedOpportunity(opportunityId, fundraiserId) {
  const opportunity = await Opportunity.findById(opportunityId);

  if (!opportunity) {
    const err = new Error("Opportunity not found");
    err.statusCode = 404;
    throw err;
  }

  if (opportunity.fundraiserId.toString() !== fundraiserId) {
    const err = new Error("You do not have permission to perform this action");
    err.statusCode = 403;
    throw err;
  }

  return opportunity;
}

module.exports = { getOwnedOpportunity };
