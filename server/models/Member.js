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
     * When a member registers (or later from their profile), they upload
     * their PhD degree document.  The file is stored externally (e.g. on
     * Cloudinary or an S3-compatible bucket) and only the public URL is
     * saved here.
     *
     * phdDegreeUrl      → URL of the uploaded degree document (PDF / image).
     *                     Set by the member via PUT /api/members/:id/phd-degree.
     * phdDegreeVerified → true once an admin has reviewed the document and
     *                     marked it as verified via PUT /api/members/:id/verify-degree.
     * phdDegreeVerifiedAt → timestamp of when the admin verified it.
     * phdDegreeVerifiedBy → ObjectId of the admin who verified it.
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
    thesisPhase: {
      type: String,
      enum: [
        "Proposal",
        "Literature Review",
        "Research",
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