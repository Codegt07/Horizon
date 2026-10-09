const { z } = require("zod");
const { validate } = require("./auth.validator");

const opportunitySchema = z.object({
  title: z
    .string({ required_error: "Title is required" })
    .trim()
    .min(1, "Title is required")
    .max(200, "Title cannot exceed 200 characters"),

  description: z
    .string({ required_error: "Description is required" })
    .trim()
    .min(1, "Description is required")
    .max(5000, "Description cannot exceed 5000 characters"),

  targetAmount: z
    .number({ required_error: "Target amount is required", invalid_type_error: "Target amount must be a number" })
    .positive("Target amount must be greater than 0"),

  minInvestment: z
    .number({ required_error: "Minimum investment is required", invalid_type_error: "Minimum investment must be a number" })
    .positive("Minimum investment must be greater than 0"),

  deadline: z
    .string({ required_error: "Deadline is required" })
    .refine((v) => !isNaN(Date.parse(v)), { message: "Deadline must be a valid date" })
    .refine((v) => new Date(v) > new Date(), { message: "Deadline must be in the future" }),

  status: z
    .enum(["draft", "active"], {
      invalid_type_error: "Status must be draft or active",
    })
    .optional()
    .default("draft"),
});

// Partial schema for PATCH updates — all fields optional, at least one required
const opportunityUpdateSchema = opportunitySchema
  .omit({ status: true })          // status is updated separately by system logic
  .extend({
    status: z
      .enum(["draft", "active"], { invalid_type_error: "Status must be draft or active" })
      .optional(),
  })
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one field must be provided for update" }
  );

module.exports = { opportunitySchema, opportunityUpdateSchema, validate };
