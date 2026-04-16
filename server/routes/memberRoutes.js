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
  uploadPhdDegree,
  verifyPhdDegree,
} = require("../controllers/memberController");

// ── Public ────────────────────────────────────────────────────────────────────
// NOTE: all named sub-routes (/phd-tracker) must come BEFORE /:id
router.get("/phd-tracker", getPhdTracker); // PhD progress tracker — public
router.get("/",            getMembers);    // list all / grouped
router.get("/:id",         getMemberById); // single member + their team

// ── Admin only ────────────────────────────────────────────────────────────────
router.post  ("/",    protect, authorise("admin"), createMember);
router.delete("/:id", protect, authorise("admin"), deleteMember);

// Admin reviews and marks a PhD degree as verified / unverified
// PUT /api/members/:id/verify-degree  body: { verified: true|false }
router.put("/:id/verify-degree", protect, authorise("admin"), verifyPhdDegree);

// ── Admin or member (own profile) ─────────────────────────────────────────────
// General profile update — member can only edit their own, enforced in controller
router.put("/:id", protect, authorise("admin", "member"), updateMember);

// Member uploads their PhD degree document URL
// PUT /api/members/:id/phd-degree  body: { phdDegreeUrl: "https://..." }
router.put("/:id/phd-degree", protect, authorise("admin", "member"), uploadPhdDegree);

module.exports = router;