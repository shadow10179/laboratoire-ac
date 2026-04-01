const mongoose = require("mongoose");

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
    publicationType: {
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

    
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },
    citations: { type: Number, default: 0 },

   
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    // Member/admin who submitted the publication
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Admin who reviewed it
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt:      { type: Date,   default: null },
    rejectionReason: { type: String, default: "" },

    
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);


publicationSchema.index({
  title:     "text",
  authors:   "text",
  publisher: "text",
  abstract:  "text",
  tags:      "text",
});

module.exports = mongoose.model("Publication", publicationSchema);