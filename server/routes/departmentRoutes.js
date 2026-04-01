const express = require("express");
const router  = express.Router();

const { protect, authorise } = require("../middleware/auth");
const {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require("../controllers/departmentController");

// ── Public
router.get("/",    getDepartments);    
router.get("/:id", getDepartmentById); 

// ── Admin only 
router.post  ("/",    protect, authorise("admin"), createDepartment);
router.put   ("/:id", protect, authorise("admin"), updateDepartment);
router.delete("/:id", protect, authorise("admin"), deleteDepartment);

module.exports = router;