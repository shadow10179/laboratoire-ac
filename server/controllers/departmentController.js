const Department = require("../models/Department");
const Team       = require("../models/Team");

/**
 * @desc    Get all active departments with live team count
 * @route   GET /api/departments
 * @access  Public
 */
const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({ isActive: true })
      .populate("headOfDepartment", "fullName academicRole photoUrl")
      .sort({ name: 1 });

    // Attach a live team count to each department
    const result = await Promise.all(
      departments.map(async (dept) => {
        const teamCount = await Team.countDocuments({
          department: dept._id,
          isActive:   true,
        });
        return { ...dept.toObject(), teamCount };
      })
    );

    res.status(200).json({ success: true, count: result.length, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get a single department with all its teams and members
 * @route   GET /api/departments/:id
 * @access  Public
 */
const getDepartmentById = async (req, res, next) => {
  try {
    const dept = await Department.findById(req.params.id).populate(
      "headOfDepartment",
      "fullName academicRole photoUrl bio"
    );

    if (!dept) {
      res.status(404);
      throw new Error("Department not found");
    }

    const teams = await Team.find({ department: dept._id, isActive: true })
      .populate("teamMembers", "fullName academicRole specialization photoUrl")
      .populate("leaderId",    "fullName photoUrl")
      .select(
        "teamName leaderName researchFocus researchProgress progressNote teamMembers activeProjects tags leaderId"
      );

    res.status(200).json({
      success: true,
      data: { ...dept.toObject(), teams, teamCount: teams.length },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create a department (admin only)
 * @route   POST /api/departments
 * @access  Private — admin
 */
const createDepartment = async (req, res, next) => {
  try {
    const dept = await Department.create(req.body);
    res.status(201).json({ success: true, message: "Department created", data: dept });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update a department (admin only)
 * @route   PUT /api/departments/:id
 * @access  Private — admin
 */
const updateDepartment = async (req, res, next) => {
  try {
    const dept = await Department.findByIdAndUpdate(req.params.id, req.body, {
      new:           true,
      runValidators: true,
    });
    if (!dept) {
      res.status(404);
      throw new Error("Department not found");
    }
    res.status(200).json({ success: true, message: "Department updated", data: dept });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete a department — only if no teams are still linked to it
 * @route   DELETE /api/departments/:id
 * @access  Private — admin
 */
const deleteDepartment = async (req, res, next) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) {
      res.status(404);
      throw new Error("Department not found");
    }

    const teamCount = await Team.countDocuments({ department: dept._id });
    if (teamCount > 0) {
      res.status(400);
      throw new Error(
        `Cannot delete — ${teamCount} team(s) are still linked to this department. Reassign or delete those teams first.`
      );
    }

    await dept.deleteOne();
    res.status(200).json({ success: true, message: "Department deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};