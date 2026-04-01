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

// ── Public 
router.post("/register", register); // member self-reg → status: pending
router.post("/login",    login);    // returns JWT for approved accounts only

// ── Any authenticated user 
router.get("/me", protect, getMe);    
router.put("/me", protect, updateMe); 

// ── Admin — registration approval queue
router.get("/pending",      protect, authorise("admin"), getPendingRegistrations);
router.put("/approve/:id",  protect, authorise("admin"), approveRegistration);
router.put("/reject/:id",   protect, authorise("admin"), rejectRegistration);

// ── Admin — full user management
router
  .route("/users")
  .get (protect, authorise("admin"), getUsers)    // list all users
  .post(protect, authorise("admin"), createUser); // create admin / head_of_lab / member

router
  .route("/users/:id")
  .get   (protect, authorise("admin"), getUserById) // get one user
  .put   (protect, authorise("admin"), updateUser)  // change role / status
  .delete(protect, authorise("admin"), deleteUser); // remove account

module.exports = router;