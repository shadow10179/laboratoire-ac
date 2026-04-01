const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  title:         { type: String, required: true },
  description:   { type: String, default: "" },
  startDate:     { type: Date },
  status: {
    type: String,
    enum: ["Planning", "Active", "Completed", "On Hold"],
    default: "Active",
  },
  fundingSource: { type: String, default: "" },
});

const teamSchema = new mongoose.Schema(
  {
    teamName: {
      type: String,
      required: [true, "Team name is required"],
      unique: true,
      trim: true,
    },
    leaderName: {
      type: String,
      required: [true, "Leader name is required"],
      trim: true,
    },
  
    leaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },

    // Every team belongs to exactly one Department
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department is required"],
    },

    researchFocus: {
      type: String,
      required: [true, "Research focus is required"],
      trim: true,
    },
    description: {
      type: String,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: "",
    },

    
    teamMembers: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Member" },
    ],

    activeProjects: [projectSchema],

    
    tags:    [{ type: String, trim: true, lowercase: true }],
    logoUrl: { type: String, default: "" },

    isActive: { type: Boolean, default: true },

  
    researchProgress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    
    progressNote: {
      type: String,
      maxlength: [300, "Progress note cannot exceed 300 characters"],
      default: "",
    },
  },
  { timestamps: true }
);


teamSchema.virtual("memberCount").get(function () {
  return this.teamMembers.length;
});
teamSchema.set("toJSON",   { virtuals: true });
teamSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Team", teamSchema);