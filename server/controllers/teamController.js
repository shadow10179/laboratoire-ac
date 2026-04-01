const Team       = require("../models/Team");
const Member     = require("../models/Member");
const Department = require("../models/Department");

const MEMBER_BRIEF = "fullName academicRole specialization photoUrl email linkedIn";
const MEMBER_FULL  =
  "fullName academicRole specialization photoUrl email bio linkedIn googleScholar thesisTitle thesisProgress thesisPhase age faculty";

/**
 * @desc    Get all teams
 *          ?active=true|false   → filter by isActive
 *          ?department=<id>     → filter by department
 * @route   GET /api/teams
 * @access  Public
 */
const getTeams = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.active === "true")  filter.isActive    = true;
    if (req.query.active === "false") filter.isActive    = false;
    if (req.query.department)         filter.department  = req.query.department;

    const teams = await Team.find(filter)
      .populate("teamMembers", MEMBER_BRIEF)
      .populate("leaderId",    "fullName email photoUrl")
      .populate("department",  "name code")
      .sort({ teamName: 1 });

    res.status(200).json({ success: true, count: teams.length, data: teams });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get a single team with full member details
 * @route   GET /api/teams/:id
 * @access  Public
 */
const getTeamById = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate("teamMembers", MEMBER_FULL)
      .populate("leaderId",    "fullName email photoUrl bio")
      .populate("department",  "name code description");

    if (!team) {
      res.status(404);
      throw new Error("Team not found");
    }
    res.status(200).json({ success: true, data: team });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create a team (admin only)
 * @route   POST /api/teams
 * @access  Private — admin
 */
const createTeam = async (req, res, next) => {
  try {
    const dept = await Department.findById(req.body.department);
    if (!dept) {
      res.status(404);
      throw new Error("Department not found");
    }

    if (req.body.teamMembers?.length) {
      const found = await Member.find({ _id: { $in: req.body.teamMembers } });
      if (found.length !== req.body.teamMembers.length) {
        res.status(400);
        throw new Error("One or more member IDs are invalid");
      }
    }

    const team      = await Team.create(req.body);
    const populated = await Team.findById(team._id)
      .populate("teamMembers", MEMBER_BRIEF)
      .populate("department",  "name code");

    res.status(201).json({ success: true, message: "Team created", data: populated });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update a team (admin only)
 * @route   PUT /api/teams/:id
 * @access  Private — admin
 */
const updateTeam = async (req, res, next) => {
  try {
    if (req.body.department) {
      const dept = await Department.findById(req.body.department);
      if (!dept) {
        res.status(404);
        throw new Error("Department not found");
      }
    }
    if (req.body.teamMembers?.length) {
      const found = await Member.find({ _id: { $in: req.body.teamMembers } });
      if (found.length !== req.body.teamMembers.length) {
        res.status(400);
        throw new Error("One or more member IDs are invalid");
      }
    }

    const team = await Team.findByIdAndUpdate(req.params.id, req.body, {
      new:           true,
      runValidators: true,
    })
      .populate("teamMembers", MEMBER_BRIEF)
      .populate("department",  "name code");

    if (!team) {
      res.status(404);
      throw new Error("Team not found");
    }
    res.status(200).json({ success: true, message: "Team updated", data: team });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update research progress bar of a team (admin only)
 * @route   PATCH /api/teams/:id/progress
 * @access  Private — admin
 * @body    { researchProgress: 0-100, progressNote?: string }
 */
const updateTeamProgress = async (req, res, next) => {
  try {
    const { researchProgress, progressNote } = req.body;

    if (researchProgress === undefined) {
      res.status(400);
      throw new Error("researchProgress (0–100) is required");
    }
    if (researchProgress < 0 || researchProgress > 100) {
      res.status(400);
      throw new Error("researchProgress must be between 0 and 100");
    }

    const update = { researchProgress };
    if (progressNote !== undefined) update.progressNote = progressNote;

    const team = await Team.findByIdAndUpdate(req.params.id, update, {
      new: true, runValidators: true,
    }).populate("department", "name code");

    if (!team) {
      res.status(404);
      throw new Error("Team not found");
    }

    res.status(200).json({
      success: true,
      message: "Research progress updated",
      data: {
        id:               team._id,
        teamName:         team.teamName,
        researchProgress: team.researchProgress,
        progressNote:     team.progressNote,
        department:       team.department,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add a member to a team (admin only)
 * @route   POST /api/teams/:id/members
 * @access  Private — admin
 * @body    { memberId }
 */
const addMemberToTeam = async (req, res, next) => {
  try {
    const { memberId } = req.body;
    if (!memberId) {
      res.status(400);
      throw new Error("memberId is required");
    }

    const [member, team] = await Promise.all([
      Member.findById(memberId),
      Team.findById(req.params.id),
    ]);
    if (!member) { res.status(404); throw new Error("Member not found"); }
    if (!team)   { res.status(404); throw new Error("Team not found"); }

    if (team.teamMembers.map(String).includes(String(memberId))) {
      res.status(400);
      throw new Error("Member is already in this team");
    }

    team.teamMembers.push(memberId);
    await team.save();

    const updated = await Team.findById(team._id)
      .populate("teamMembers", MEMBER_BRIEF)
      .populate("department",  "name code");

    res.status(200).json({ success: true, message: "Member added to team", data: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Remove a member from a team (admin only)
 * @route   DELETE /api/teams/:id/members/:memberId
 * @access  Private — admin
 */
const removeMemberFromTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) { res.status(404); throw new Error("Team not found"); }

    team.teamMembers = team.teamMembers.filter(
      (id) => id.toString() !== req.params.memberId
    );
    await team.save();

    res.status(200).json({ success: true, message: "Member removed from team" });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete a team (admin only)
 * @route   DELETE /api/teams/:id
 * @access  Private — admin
 */
const deleteTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) { res.status(404); throw new Error("Team not found"); }

    await team.deleteOne();
    res.status(200).json({ success: true, message: "Team deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  updateTeamProgress,
  addMemberToTeam,
  removeMemberFromTeam,
  deleteTeam,
};