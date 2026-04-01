const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    
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
    // Faculty the member belongs to, e.g. "Faculty of Science", "Faculty of Engineering"
    faculty: {
      type: String,
      trim: true,
      default: "",
    },
    photoUrl:      { type: String, default: "" },
    bio:           { type: String, maxlength: [500, "Bio cannot exceed 500 characters"], default: "" },
    linkedIn:      { type: String, default: "" },
    googleScholar: { type: String, default: "" },

    //  Academic role inside the lab 
    // Distinct from User.role (which controls system access)
    academicRole: {
      type: String,
      enum: ["Professor", "Doctor", "PhD Student", "Researcher", "Associate"],
      required: [true, "Academic role is required"],
    },
    specialization: { type: String, trim: true, default: "" },

    // ── PhD Progress Tracker (PhD Students only)
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