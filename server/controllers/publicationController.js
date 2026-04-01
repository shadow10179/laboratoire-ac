const Publication = require("../models/Publication");


//  PUBLIC — visitors see only approved publications


/**
 * @desc    List all APPROVED publications with optional filters + pagination
 *          ?query=  ?year=  ?type=  ?tag=  ?team=  ?page=  ?limit=
 * @route   GET /api/publications
 * @access  Public
 */
const getPublications = async (req, res, next) => {
  try {
    const { query, year, type, tag, team, page = 1, limit = 10 } = req.query;

    const filter = { approvalStatus: "approved" };
    if (query) filter.$text = { $search: query };
    if (year)  filter.year  = Number(year);
    if (type)  filter.publicationType = type;
    if (team)  filter.team  = team;
    if (tag)   filter.tags  = { $in: [tag.toLowerCase()] };

    const skip = (Number(page) - 1) * Number(limit);

    const [publications, total] = await Promise.all([
      Publication.find(filter)
        .populate("team", "teamName")
        .sort({ year: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Publication.countDocuments(filter),
    ]);

    res.status(200).json({
      success:     true,
      count:       publications.length,
      total,
      totalPages:  Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      data:        publications,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Dedicated search endpoint (PDF spec: /api/publications/search?query=AI)
 *          Sorts results by text relevance score
 * @route   GET /api/publications/search
 * @access  Public
 */
const searchPublications = async (req, res, next) => {
  try {
    const { query, year, type, tag, team, page = 1, limit = 10 } = req.query;

    if (!query || !query.trim()) {
      res.status(400);
      throw new Error("Please provide a search query: ?query=your+terms");
    }

    const filter = { approvalStatus: "approved", $text: { $search: query } };
    if (year) filter.year = Number(year);
    if (type) filter.publicationType = type;
    if (team) filter.team = team;
    if (tag)  filter.tags = { $in: [tag.toLowerCase()] };

    const skip = (Number(page) - 1) * Number(limit);

    const [results, total] = await Promise.all([
      Publication.find(filter, { score: { $meta: "textScore" } })
        .populate("team", "teamName")
        .sort({ score: { $meta: "textScore" }, year: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Publication.countDocuments(filter),
    ]);

    res.status(200).json({
      success:     true,
      query,
      count:       results.length,
      total,
      totalPages:  Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      data:        results,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get a single APPROVED publication by ID
 * @route   GET /api/publications/:id
 * @access  Public
 */
const getPublicationById = async (req, res, next) => {
  try {
    const pub = await Publication.findOne({
      _id:            req.params.id,
      approvalStatus: "approved",
    })
      .populate("team",        "teamName researchFocus")
      .populate("submittedBy", "name email")
      .populate("reviewedBy",  "name email");

    if (!pub) {
      res.status(404);
      throw new Error("Publication not found");
    }
    res.status(200).json({ success: true, data: pub });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Aggregated stats for approved publications
 * @route   GET /api/publications/stats
 * @access  Public
 */
const getPublicationStats = async (req, res, next) => {
  try {
    const [total, byYear, byType] = await Promise.all([
      Publication.countDocuments({ approvalStatus: "approved" }),
      Publication.aggregate([
        { $match: { approvalStatus: "approved" } },
        { $group: { _id: "$year", count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
      ]),
      Publication.aggregate([
        { $match: { approvalStatus: "approved" } },
        { $group: { _id: "$publicationType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.status(200).json({ success: true, data: { total, byYear, byType } });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Export citation in BibTeX or APA format (approved only)
 * @route   GET /api/publications/:id/cite?format=bibtex|apa
 * @access  Public
 */
const exportCitation = async (req, res, next) => {
  try {
    const pub = await Publication.findOne({
      _id:            req.params.id,
      approvalStatus: "approved",
    });
    if (!pub) {
      res.status(404);
      throw new Error("Publication not found");
    }

    const { format = "apa" } = req.query;
    const { title, authors, year, publisher, doi, pdfLink } = pub;
    let citation = "";

    if (format === "bibtex") {
      const authorsStr = authors
        .map((a) => { const p = a.trim().split(" "); const l = p.pop(); return `${l}, ${p.join(" ")}`; })
        .join(" and ");
      const key     = `${authors[0].trim().split(" ").pop()}${year}`;
      const doiLine = doi     ? `  doi     = {${doi}},\n`     : "";
      const urlLine = pdfLink ? `  url     = {${pdfLink}},\n` : "";
      citation =
        `@article{${key},\n` +
        `  author  = {${authorsStr}},\n` +
        `  title   = {${title}},\n` +
        `  journal = {${publisher}},\n` +
        `  year    = {${year}},\n` +
        `${doiLine}${urlLine}}`;

    } else if (format === "apa") {
      const authorsStr = authors
        .map((a, i) => {
          const p = a.trim().split(" "); const l = p.pop();
          const initials = p.map((n) => `${n[0]}.`).join(" ");
          const fmt = `${l}, ${initials}`;
          return i === authors.length - 1 && authors.length > 1 ? `& ${fmt}` : fmt;
        })
        .join(", ");
      const suffix = doi ? ` https://doi.org/${doi}` : pdfLink ? ` ${pdfLink}` : "";
      citation = `${authorsStr} (${year}). ${title}. *${publisher}*.${suffix}`;

    } else {
      res.status(400);
      throw new Error("format must be 'bibtex' or 'apa'");
    }

    res.status(200).json({ success: true, format, citation });
  } catch (err) {
    next(err);
  }
};


//  MEMBER — submit a publication for admin review


/**
 * @desc    Submit a publication
 *          admin  → immediately approved and publicly visible
 *          member → goes into "pending" for admin review
 * @route   POST /api/publications
 * @access  Private — admin | member
 */
const createPublication = async (req, res, next) => {
  try {
    const isAdmin      = req.user.role === "admin";
    const pubData      = {
      ...req.body,
      submittedBy:    req.user._id,
      approvalStatus: isAdmin ? "approved" : "pending",
      isPublished:    isAdmin,
    };

    const pub = await Publication.create(pubData);

    res.status(201).json({
      success: true,
      message: isAdmin
        ? "Publication created and approved"
        : "Publication submitted — pending admin approval",
      data: pub,
    });
  } catch (err) {
    next(err);
  }
};


//  ADMIN — approval workflow


/**
 * @desc    Get all pending publications (admin review queue)
 * @route   GET /api/publications/pending
 * @access  Private — admin
 */
const getPendingPublications = async (req, res, next) => {
  try {
    const pubs = await Publication.find({ approvalStatus: "pending" })
      .populate("team",        "teamName")
      .populate("submittedBy", "name email")
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, count: pubs.length, data: pubs });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Approve a publication — makes it publicly visible
 * @route   PUT /api/publications/:id/approve
 * @access  Private — admin
 */
const approvePublication = async (req, res, next) => {
  try {
    const pub = await Publication.findById(req.params.id);
    if (!pub) { res.status(404); throw new Error("Publication not found"); }
    if (pub.approvalStatus === "approved") {
      res.status(400); throw new Error("Publication is already approved");
    }

    pub.approvalStatus  = "approved";
    pub.isPublished     = true;
    pub.reviewedBy      = req.user._id;
    pub.reviewedAt      = new Date();
    pub.rejectionReason = "";
    await pub.save();

    res.status(200).json({
      success: true,
      message: "Publication approved and is now publicly visible",
      data:    pub,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Reject a publication — it will NOT be publicly visible
 * @route   PUT /api/publications/:id/reject
 * @access  Private — admin
 * @body    { reason?: string }
 */
const rejectPublication = async (req, res, next) => {
  try {
    const pub = await Publication.findById(req.params.id);
    if (!pub) { res.status(404); throw new Error("Publication not found"); }
    if (pub.approvalStatus === "rejected") {
      res.status(400); throw new Error("Publication is already rejected");
    }

    pub.approvalStatus  = "rejected";
    pub.isPublished     = false;
    pub.reviewedBy      = req.user._id;
    pub.reviewedAt      = new Date();
    pub.rejectionReason = req.body.reason || "";
    await pub.save();

    res.status(200).json({ success: true, message: "Publication rejected", data: pub });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Admin view of ALL publications regardless of approval status
 *          ?approvalStatus=pending|approved|rejected  ?team=  ?page=  ?limit=
 * @route   GET /api/publications/all
 * @access  Private — admin
 */
const getAllPublicationsAdmin = async (req, res, next) => {
  try {
    const { approvalStatus, team, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (approvalStatus) filter.approvalStatus = approvalStatus;
    if (team)           filter.team           = team;

    const skip = (Number(page) - 1) * Number(limit);

    const [pubs, total] = await Promise.all([
      Publication.find(filter)
        .populate("team",        "teamName")
        .populate("submittedBy", "name email")
        .populate("reviewedBy",  "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Publication.countDocuments(filter),
    ]);

    res.status(200).json({
      success:     true,
      count:       pubs.length,
      total,
      totalPages:  Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      data:        pubs,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update publication metadata (admin only)
 * @route   PUT /api/publications/:id
 * @access  Private — admin
 */
const updatePublication = async (req, res, next) => {
  try {
    // Keep isPublished in sync when approvalStatus is changed directly
    if (req.body.approvalStatus) {
      req.body.isPublished = req.body.approvalStatus === "approved";
    }

    const pub = await Publication.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!pub) { res.status(404); throw new Error("Publication not found"); }

    res.status(200).json({ success: true, message: "Publication updated", data: pub });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete a publication (admin only)
 * @route   DELETE /api/publications/:id
 * @access  Private — admin
 */
const deletePublication = async (req, res, next) => {
  try {
    const pub = await Publication.findById(req.params.id);
    if (!pub) { res.status(404); throw new Error("Publication not found"); }

    await pub.deleteOne();
    res.status(200).json({ success: true, message: "Publication deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
};