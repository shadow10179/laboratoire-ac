const express = require("express");
const router  = express.Router();

const { protect, authorise } = require("../middleware/auth");
const {
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  getPhdTracker,
} = require("../controllers/memberController");

// ── Public 
// NOTE: /phd-tracker must be declared BEFORE /:id
router.get("/phd-tracker", getPhdTracker);          
router.get("/",            getMembers);             
router.get("/:id",         getMemberById);          

// ── Admin only 
router.post  ("/",    protect, authorise("admin"),           createMember);
router.delete("/:id", protect, authorise("admin"),           deleteMember);


router.put("/:id", protect, authorise("admin", "member"), updateMember);

module.exports = router;