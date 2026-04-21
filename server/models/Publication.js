const mongoose = require("mongoose");

/*
 * Publication
 * ───────────
 * Field name alignment with the frontend (fakeData.js / Publications.jsx):
 *
 *   Frontend field   Backend field (this file)
 *   ─────────────    ─────────────────────────
 *   pub.type         type           ← was publicationType, renamed to match
 *   pub.title        title          ✓
 *   pub.authors      authors        ✓
 *   pub.year         year           ✓
 *   pub.publisher    publisher      ✓
 *   pub.pdfLink      pdfLink        ✓
 *   pub.tags         tags           ✓
 *   pub.citations    citations      ✓
 *   pub.team         team           ✓ (ObjectId ref)
 */
const publicationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    authors: [{ type: String, required: true, trim: true }],
    year: {
      type: Number,
      required: [true, "Year is required"],
      min: [1900, "Year must be after 1900"],
      max: [new Date().getFullYear() + 1, "Year cannot be in the future"],
    },
    publisher: {
      type: String,
      required: [true, "Journal / Conference name is required"],
      trim: true,
    },
    // Renamed from publicationType → type to match the frontend field name
    type: {
      type: String,
      enum: [
        "Journal Article",
        "Conference Paper",
        "Book Chapter",
        "Thesis",
        "Technical Report",
        "Preprint",
      ],
      default: "Journal Article",
    },
    pdfLink:  { type: String, trim: true, default: "" },
    doi:      { type: String, trim: true, default: "" },
    abstract: {
      type: String,
      maxlength: [2000, "Abstract cannot exceed 2000 characters"],
      default: "",
    },
    tags: [{ type: String, trim: true, lowercase: true }],

    // Optional direct link to the team that produced this publication
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },
    citations: { type: Number, default: 0 },

    // ── Approval workflow ─────────────────────────────────────────────────────
    /*
     * approvalStatus
     * ──────────────
     * pending   → submitted by a member; waiting for admin review
     * approved  → admin approved; visible to the public
     * rejected  → admin rejected; NOT publicly visible
     */
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt:      { type: Date,   default: null },
    rejectionReason: { type: String, default: "" },

    // Kept in sync with approvalStatus === "approved"
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Full-text search index
publicationSchema.index({
  title:     "text",
  authors:   "text",
  publisher: "text",
  abstract:  "text",
  tags:      "text",
});

module.exports = mongoose.model("Publication", publicationSchema);