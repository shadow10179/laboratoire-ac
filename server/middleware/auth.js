const jwt  = require("jsonwebtoken");
const User = require("../models/User");

/**
 * protect
 * ───────
 * Verifies the JWT from "Authorization: Bearer <token>".
 * Attaches the full User document to req.user on success.
 * Blocks with 401 / 403 on any failure.
 *
 * NOTE: Visitors browse the public site without any account or token.
 * The protect middleware is only applied to routes that require a login
 * (member, admin, or head_of_lab).
 */
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

/**
 * authorise(...roles)
 * ───────────────────
 * Must come AFTER protect in the middleware chain.
 * Passes only if req.user.role is in the allowed list.
 *
 * Valid roles: "member", "admin", "head_of_lab"
 *
 * Examples:
 *   protect, authorise("admin")
 *   protect, authorise("admin", "head_of_lab")
 *   protect, authorise("admin", "member")
 */
const authorise = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied — role '${req.user.role}' cannot perform this action`,
    });
  }
  next();
};

/**
 * optionalAuth
 * ────────────
 * Attaches req.user if a valid, approved token is present.
 * Does NOT block the request when no token is provided.
 * Use on public endpoints that can optionally personalise the response
 * for logged-in members.
 */
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