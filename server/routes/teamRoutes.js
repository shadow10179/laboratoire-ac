const express = require("express");
const router  = express.Router();

const { protect, authorise } = require("../middleware/auth");
const {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  updateTeamProgress,
  addMemberToTeam,
  removeMemberFromTeam,
  deleteTeam,
} = require("../controllers/teamController");

// ── Public 
router.get("/",    getTeams);    // ?active=true&department=<id>
router.get("/:id", getTeamById); // full team detail

// ── Admin only
router.post  ("/",                      protect, authorise("admin"), createTeam);
router.put   ("/:id",                   protect, authorise("admin"), updateTeam);
router.delete("/:id",                   protect, authorise("admin"), deleteTeam);

// Progress bar update
router.patch ("/:id/progress",          protect, authorise("admin"), updateTeamProgress);

// Member management within a team
router.post  ("/:id/members",           protect, authorise("admin"), addMemberToTeam);
router.delete("/:id/members/:memberId", protect, authorise("admin"), removeMemberFromTeam);

module.exports = router;