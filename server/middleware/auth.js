const jwt  = require("jsonwebtoken");
const User = require("../models/User");


const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorised — no token provided",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not authorised — user no longer exists",
      });
    }
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account deactivated — contact an administrator",
      });
    }
    if (user.authStatus === "pending") {
      return res.status(403).json({
        success: false,
        message: "Your registration is pending admin approval",
      });
    }
    if (user.authStatus === "rejected") {
      return res.status(403).json({
        success: false,
        message: "Your registration was rejected — contact an administrator",
      });
    }

    req.user = user;
    next();
  } catch (_) {
    return res.status(401).json({
      success: false,
      message: "Not authorised — token is invalid or expired",
    });
  }
};


const authorise = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied — role '${req.user.role}' cannot perform this action`,
    });
  }
  next();
};


const optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select("-password");
    if (user && user.isActive && user.authStatus === "approved") {
      req.user = user;
    }
  } catch (_) {
    // Invalid token — continue as unauthenticated visitor
  }

  next();
};

module.exports = { protect, authorise, optionalAuth };