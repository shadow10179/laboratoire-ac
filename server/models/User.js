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
     * team_leader  → a member who also leads a research team.
     *                Has access to the "My Work" dashboard in the frontend.
     *                Extends member privileges.
     * admin        → full control: approve/reject members & publications,
     *                manage teams/departments, update progress bars,
     *                verify PhD degrees.
     * head_of_lab  → read-only high-level overview of all departments,
     *                teams, members and research progress.
     *
     * Visitors browse the public site with NO account required.
     */
    role: {
      type: String,
      enum: ["member", "team_leader", "admin", "head_of_lab"],
      default: "member",
    },

    /*
     * AUTH STATUS — member registration approval flow
     * ──────────────────────────────────────────────────────────────────────
     * pending   → member registered; awaiting admin decision
     * approved  → admin accepted; member can log in
     * rejected  → admin rejected; login is blocked
     *
     * Accounts created directly by an admin (admin / head_of_lab / team_leader)
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

    // Only set when role === "member" or "team_leader"
    memberProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },

    /*
     * _registrationMeta
     * ──────────────────────────────────────────────────────────────────────
     * Temporary storage for extra fields the applicant submits at
     * registration time. Visible to the admin in the approval queue.
     * Moved to the Member document when the admin approves the account,
     * then cleared from here.
     *
     * degree: { name, data } — base64-encoded PDF uploaded at registration.
     *   The admin previews it in an <iframe> directly from the base64 data
     *   without any external file storage service required.
     */
    _registrationMeta: {
      academicRole:   { type: String, default: "" },
      specialization: { type: String, default: "" },
      age:            { type: Number, default: null },
      faculty:        { type: String, default: "" },
      // Degree document uploaded at registration as a base64 PDF
      degree: {
        name: { type: String, default: "" },  // original filename
        data: { type: String, default: "" },  // base64 data URI (data:application/pdf;base64,...)
      },
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