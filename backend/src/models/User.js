const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: false,      // OAuth users with no verified email have null here
      unique: true,
      sparse: true,         // allows multiple null values in the unique index
      lowercase: true,
      trim: true,
      default: null,
    },
    passwordHash: {
      type: String,
      default: null, // null for OAuth-only accounts (Phase 3)
    },
    role: {
      type: String,
      enum: {
        values: ["investor", "fundraiser"],
        message: "Role must be investor or fundraiser",
      },
      required: [true, "Role is required"],
    },
    // OAuth fields — populated in Phase 3
    googleId: {
      type: String,
      default: null,
    },
    isProfileComplete: {
      type: Boolean,
      default: true, // email/password registrations are always complete
    },
    // Wallet balance — relevant for investors, kept on User for simplicity
    walletBalance: {
      type: Number,
      default: 0,
      min: [0, "Wallet balance cannot be negative"],
    },
  },
  { timestamps: true }
);

// Hash password before saving — only when passwordHash has been set or changed.
// Using the promise-based async style: Mongoose awaits the returned promise,
// so next() is not needed and must not be called.
userSchema.pre("save", async function () {
  if (!this.isModified("passwordHash") || !this.passwordHash) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  // Any error thrown here rejects the promise and Mongoose propagates it
  // to the caller — no explicit error handling needed.
});

// Compare a plain-text password against the stored hash.
userSchema.methods.comparePassword = async function (plainPassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// Strip sensitive fields from all JSON serialisations.
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.googleId;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
