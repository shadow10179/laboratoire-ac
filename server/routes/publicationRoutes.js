const express = require("express");
const router  = express.Router();

const { protect, authorise } = require("../middleware/auth");
const {
  getPublications,
  searchPublications,
  getPublicationById,
  getPublicationStats,
  exportCitation,
  createPublication,
  getPendingPublications,
  approvePublication,
  rejectPublication,
  getAllPublicationsAdmin,
  updatePublication,
  deletePublication,
} = require("../controllers/publicationController");

// ── Public ────────────────────────────────────────────────────────────────────
// IMPORTANT: all named routes must come BEFORE /:id

router.get("/search",    searchPublications);   // /search?query=AI
router.get("/stats",     getPublicationStats);  // aggregated stats
router.get("/",          getPublications);      // approved list
router.get("/:id",       getPublicationById);   // single approved pub
router.get("/:id/cite",  exportCitation);       // BibTeX / APA export

// ── Admin — approval workflow ─────────────────────────────────────────────────
// Named routes — must come before /:id routes
router.get("/pending",     protect, authorise("admin"), getPendingPublications);
router.get("/all",         protect, authorise("admin"), getAllPublicationsAdmin);
router.put("/:id/approve", protect, authorise("admin"), approvePublication);
router.put("/:id/reject",  protect, authorise("admin"), rejectPublication);

// ── Admin — CRUD ──────────────────────────────────────────────────────────────
router.put   ("/:id", protect, authorise("admin"), updatePublication);
router.delete("/:id", protect, authorise("admin"), deletePublication);

// ── Admin | Member | Team Leader — submit a publication ───────────────────────
// team_leader added so the frontend My Work / Publications page can submit
router.post("/", protect, authorise("admin", "member", "team_leader"), createPublication);

module.exports = router;