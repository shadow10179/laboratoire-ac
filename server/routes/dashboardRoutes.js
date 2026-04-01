const express = require("express");
const router  = express.Router();

const { protect, authorise } = require("../middleware/auth");
const {
  getAdminDashboard,
  getAdminMembersList,
  getHeadDashboard,
  getHeadMembersList,
} = require("../controllers/dashboardController");

// ── Admin dashboard 
router.get(
  "/admin",
  protect,
  authorise("admin"),
  getAdminDashboard    
);
router.get(
  "/admin/members",
  protect,
  authorise("admin"),
  getAdminMembersList  
);

// ── Head of lab dashboard 
router.get(
  "/head",
  protect,
  authorise("head_of_lab", "admin"), 
  getHeadDashboard     
);
router.get(
  "/head/members",
  protect,
  authorise("head_of_lab", "admin"),
  getHeadMembersList   
);

module.exports = router;