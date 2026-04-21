const mongoose = require("mongoose");

/*
 * News
 * ────
 * Field name alignment with the frontend (fakeData.js / News.jsx):
 *
 *   Frontend field   Backend field (this file)
 *   ─────────────    ─────────────────────────
 *   item.image       image          ← was imageUrl, renamed to match
 *   item.headline    headline       ✓
 *   item.date        date           ✓
 *   item.category    category       ✓
 *   item.summary     summary        ✓
 *   item.author      author         ✓
 *   item.fullStory   fullStory      ✓
 */
const newsSchema = new mongoose.Schema(
  {
    headline: {
      type: String,
      required: [true, "Headline is required"],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    // Renamed from imageUrl → image to match the frontend field name
    image:     { type: String, default: "" },
    summary:   { type: String, maxlength: [300, "Summary cannot exceed 300 characters"], default: "" },
    fullStory: { type: String, required: [true, "Full story is required"] },
    category: {
      type: String,
      enum: ["Event", "Award", "Publication", "Seminar", "Announcement", "General"],
      default: "General",
    },
    tags:        [{ type: String, trim: true, lowercase: true }],
    isPublished: { type: Boolean, default: true },
    author:      { type: String, trim: true, default: "Lab Admin" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("News", newsSchema);