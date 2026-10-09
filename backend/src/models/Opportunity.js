const mongoose = require("mongoose");

const opportunitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },
    targetAmount: {
      type: Number,
      required: [true, "Target amount is required"],
      min: [1, "Target amount must be greater than 0"],
    },
    minInvestment: {
      type: Number,
      required: [true, "Minimum investment is required"],
      min: [1, "Minimum investment must be greater than 0"],
    },
    deadline: {
      type: Date,
      required: [true, "Deadline is required"],
    },

    // ── System-managed fields — never set by the client directly ───────────
    raisedAmount: {
      type: Number,
      default: 0,
      min: [0, "Raised amount cannot be negative"],
    },
    status: {
      type: String,
      enum: {
        values: ["draft", "active", "closed"],
        message: "Status must be draft, active, or closed",
      },
      default: "draft",
    },
    fundraiserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Fundraiser ID is required"],
    },
  },
  { timestamps: true }
);

// Strip __v from all JSON serialisations, consistent with User model
opportunitySchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("Opportunity", opportunitySchema);
