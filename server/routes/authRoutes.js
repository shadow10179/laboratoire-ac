const express = require("express");
const router  = express.Router();

const { protect, authorise } = require("../middleware/auth");
const {
  register,
  login,
  getMe,
  updateMe,
  getPendingRegistrations,
  approveRegistration,
  rejectRegistration,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/authController");

// ── Public ────────────────────────────────────────────────────────────────────
// Visitors browse the public site freely — no account or login required.
// Only members (and admins/heads created by the admin) have accounts.

router.post("/register", register); // member self-reg → authStatus: pending
router.post("/login",    login);    // returns JWT for approved accounts only

// ── Any authenticated user (member / admin / head_of_lab) ─────────────────────
router.get("/me", protect, getMe);    // get own profile + linked Member profile
router.put("/me", protect, updateMe); // update own name / email / password

// ── Admin — registration approval queue ──────────────────────────────────────
router.get("/pending",      protect, authorise("admin"), getPendingRegistrations);
router.put("/approve/:id",  protect, authorise("admin"), approveRegistration);
router.put("/reject/:id",   protect, authorise("admin"), rejectRegistration);

// ── Admin — full user management ──────────────────────────────────────────────
router
  .route("/users")
  .get (protect, authorise("admin"), getUsers)    // list all users (role=&authStatus=)
  .post(protect, authorise("admin"), createUser); // create admin / head_of_lab / member

router
  .route("/users/:id")
  .get   (protect, authorise("admin"), getUserById) // get one user by ID
  .put   (protect, authorise("admin"), updateUser)  // change role / isActive / authStatus
  .delete(protect, authorise("admin"), deleteUser); // permanently remove account

module.exports = router;