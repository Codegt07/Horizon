const { z } = require("zod");
const { validate } = require("./auth.validator");

const investmentSchema = z.object({
  opportunityId: z
    .string({ required_error: "Opportunity ID is required" })
    .min(1, "Opportunity ID is required"),

  amount: z
    .number({
      required_error: "Amount is required",
      invalid_type_error: "Amount must be a number",
    })
    .positive("Amount must be greater than 0"),
});

const depositSchema = z.object({
  amount: z
    .number({
      required_error: "Amount is required",
      invalid_type_error: "Amount must be a number",
    })
    .positive("Amount must be greater than 0")
    .max(100000, "Maximum deposit per transaction is ₹1,00,000"),
});

module.exports = { investmentSchema, depositSchema, validate };
