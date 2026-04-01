const express = require("express");
const router  = express.Router();

const { protect, authorise } = require("../middleware/auth");
const {
  getNews,
  getNewsById,
  createNews,
  updateNews,
  deleteNews,
} = require("../controllers/newsController");

// ── Public
router.get("/",    getNews);    // ?category=Award&page=1&limit=10
router.get("/:id", getNewsById);

// ── Admin only
router.post  ("/",    protect, authorise("admin"), createNews);
router.put   ("/:id", protect, authorise("admin"), updateNews);
router.delete("/:id", protect, authorise("admin"), deleteNews);

module.exports = router;