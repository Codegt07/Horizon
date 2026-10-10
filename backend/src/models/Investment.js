const mongoose = require("mongoose");

const investmentSchema = new mongoose.Schema(
  {
    investorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Investor ID is required"],
      index: true,
    },
    opportunityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Opportunity",
      required: [true, "Opportunity ID is required"],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [1, "Amount must be greater than 0"],
    },
  },
  { timestamps: true }
);

investmentSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("Investment", investmentSchema);
