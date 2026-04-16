const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },

    /*
     * ROLES
     * ──────────────────────────────────────────────────────────────────────
     * member       → lab member linked to a Member profile.
     *                Can edit own profile and submit publications for approval.
     *                Visitors browse the public site with NO account required —
     *                the visitor role has been removed entirely.
     * admin        → full control: approve/reject members & publications,
     *                manage teams/departments, update progress bars,
     *                verify PhD degrees.
     * head_of_lab  → read-only high-level overview of all departments,
     *                teams, members and research progress.
     */
    role: {
      type: String,
      enum: ["member", "admin", "head_of_lab"],
      default: "member",
    },

    /*
     * AUTH STATUS — member registration approval flow
     * ──────────────────────────────────────────────────────────────────────
     * pending   → member registered; awaiting admin decision
     * approved  → admin accepted; member can log in
     * rejected  → admin rejected; login is blocked
     *
     * Accounts created directly by an admin (admin / head_of_lab)
     * are always set to "approved" immediately.
     */
    authStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    // Reason stored when admin rejects a registration
    rejectionReason: {
      type: String,
      default: "",
    },

    // Only set when role === "member"
    memberProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },

    isActive:  { type: Boolean, default: true },
    lastLogin: { type: Date,    default: null },
  },
  { timestamps: true }
);

// ── Hash password before saving ──────────────────────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Compare plain-text password with stored hash ─────────────────────────────
userSchema.methods.matchPassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

// ── Sign and return a JWT ─────────────────────────────────────────────────────
userSchema.methods.getSignedJWT = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

module.exports = mongoose.model("User", userSchema);