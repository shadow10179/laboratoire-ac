const mongoose = require("mongoose");

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
    imageUrl:  { type: String, default: "" },
    fullStory: { type: String, required: [true, "Full story content is required"] },
    summary:   { type: String, maxlength: [300, "Summary cannot exceed 300 characters"] },
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