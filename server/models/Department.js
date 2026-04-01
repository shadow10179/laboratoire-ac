const mongoose = require("mongoose");


const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Department name is required"],
      unique: true,
      trim: true,
    },
    // Short code shown in the UI, e.g. "CS", "MATH", "CHEM"
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    // Optional reference to the member who heads this department
    headOfDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

departmentSchema.set("toJSON",   { virtuals: true });
departmentSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Department", departmentSchema);