const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    // Back-reference to the User account that owns this profile.
    // null = member record exists in the lab but has no login account yet.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ── Core identity ─────────────────────────────────────────────────────────
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    age: {
      type: Number,
      min: [18, "Age must be at least 18"],
      max: [100, "Age must be realistic"],
      default: null,
    },
    // Faculty the member belongs to, e.g. "Faculty of Science & Technology"
    faculty: {
      type: String,
      trim: true,
      default: "",
    },
    photoUrl:      { type: String, default: "" },
    bio:           { type: String, maxlength: [500, "Bio cannot exceed 500 characters"], default: "" },
    linkedIn:      { type: String, default: "" },
    googleScholar: { type: String, default: "" },

    // ── Academic role inside the lab ──────────────────────────────────────────
    // Distinct from User.role (which controls system access)
    academicRole: {
      type: String,
      enum: ["Professor", "Doctor", "PhD Student", "Researcher", "Associate"],
      required: [true, "Academic role is required"],
    },
    specialization: { type: String, trim: true, default: "" },

    // ── PhD Degree verification ───────────────────────────────────────────────
    /*
     * phdDegreeUrl      → Public URL of the degree document (for post-registration
     *                     uploads via PUT /api/members/:id/phd-degree).
     * phdDegreeVerified → true once an admin has reviewed and verified it.
     * phdDegreeVerifiedAt / phdDegreeVerifiedBy → audit trail.
     *
     * Note: at registration time the degree is sent as base64 directly and
     * stored in User._registrationMeta.degree. Once approved, the admin may
     * set phdDegreeUrl to a hosted URL if desired. The two mechanisms coexist.
     */
    phdDegreeUrl: {
      type: String,
      default: "",
    },
    phdDegreeVerified: {
      type: Boolean,
      default: false,
    },
    phdDegreeVerifiedAt: {
      type: Date,
      default: null,
    },
    phdDegreeVerifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ── PhD Progress Tracker ──────────────────────────────────────────────────
    thesisTitle:       { type: String, default: "" },
    thesisStartDate:   { type: Date,   default: null },
    thesisExpectedEnd: { type: Date,   default: null },
    thesisProgress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    /*
     * thesisPhase enum includes all values used by the frontend:
     *
     *  Backend-canonical    Frontend label (fakeData.js)
     *  ─────────────────    ────────────────────────────
     *  Proposal             —
     *  Literature Review    Literature Review  ✓
     *  Research             —
     *  Experimentation      Experimentation    (added for frontend)
     *  Data Collection      Data Collection    (added for frontend)
     *  Writing              Writing            ✓
     *  Defense              —
     *  Completed            —
     */
    thesisPhase: {
      type: String,
      enum: [
        "Proposal",
        "Literature Review",
        "Research",
        "Experimentation",
        "Data Collection",
        "Writing",
        "Defense",
        "Completed",
      ],
      default: "Proposal",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Member", memberSchema);