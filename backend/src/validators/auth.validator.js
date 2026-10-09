const { z } = require("zod");

const registerSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .max(100, "Name cannot exceed 100 characters"),

  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("Invalid email address"),

  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters"),

  role: z.enum(["investor", "fundraiser"], {
    required_error: "Role is required",
    invalid_type_error: "Role must be investor or fundraiser",
  }),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("Invalid email address"),

  password: z.string({ required_error: "Password is required" }).min(1, "Password is required"),
});

/**
 * Validate request body against a Zod schema.
 * Returns { data } on success or { errors } on failure.
 *
 * @param {z.ZodSchema} schema
 * @param {unknown} body
 */
function validate(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const errors = result.error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    }));
    return { errors };
  }
  return { data: result.data };
}

const completeProfileSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .max(100, "Name cannot exceed 100 characters"),

  role: z.enum(["investor", "fundraiser"], {
    required_error: "Role is required",
    invalid_type_error: "Role must be investor or fundraiser",
  }),
});

module.exports = { registerSchema, loginSchema, completeProfileSchema, validate };
