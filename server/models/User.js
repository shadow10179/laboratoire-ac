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

    
    role: {
      type: String,
      enum: ["visitor", "member", "admin", "head_of_lab"],
      default: "visitor",
    },

    
    authStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

  
    rejectionReason: {
      type: String,
      default: "",
    },


    memberProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },

    isActive:  { type: Boolean, default: true },
    lastLogin: { type: Date,    default: null },
  },
  { timestamps: true }
);


userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});


userSchema.methods.matchPassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};


userSchema.methods.getSignedJWT = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

module.exports = mongoose.model("User", userSchema);