const Member = require("../models/Member");
const Team   = require("../models/Team");

/**
 * @desc    Get all members
 *          ?academicRole=Professor  → filter by academic role
 *          ?grouped=true            → members nested inside their teams
 * @route   GET /api/members
 * @access  Public
 */
const getMembers = async (req, res, next) => {
  try {
    const { academicRole, grouped } = req.query;

    if (grouped === "true") {
      const teams = await Team.find({ isActive: true })
        .populate("teamMembers", "fullName academicRole specialization photoUrl")
        .populate("department",  "name code")
        .select("teamName leaderName researchFocus teamMembers department");

      return res.status(200).json({ success: true, data: teams });
    }

    const filter = academicRole ? { academicRole } : {};
    const members = await Member.find(filter)
      .select("-__v -phdDegreeVerifiedBy") // hide internal admin fields from public
      .sort({ academicRole: 1, fullName: 1 });

    res.status(200).json({ success: true, count: members.length, data: members });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get a single member + their team
 * @route   GET /api/members/:id
 * @access  Public
 */
const getMemberById = async (req, res, next) => {
  try {
    const member = await Member.findById(req.params.id)
      .select("-__v -phdDegreeVerifiedBy");

    if (!member) {
      res.status(404);
      throw new Error("Member not found");
    }

    const team = await Team.findOne({ teamMembers: member._id })
      .select("teamName researchFocus department")
      .populate("department", "name code");

    res.status(200).json({
      success: true,
      data: { ...member.toObject(), team: team ?? null },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create a new member record (admin only)
 * @route   POST /api/members
 * @access  Private — admin
 */
const createMember = async (req, res, next) => {
  try {
    const member = await Member.create(req.body);
    res.status(201).json({ success: true, message: "Member created", data: member });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update a member's profile fields
 *          admin  → can update any field on any member
 *          member → can only update their own linked profile;
 *                   cannot change academicRole, user back-reference,
 *                   phdDegreeVerified, phdDegreeVerifiedAt, or phdDegreeVerifiedBy
 * @route   PUT /api/members/:id
 * @access  Private — admin | member (own profile only)
 */
const updateMember = async (req, res, next) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      res.status(404);
      throw new Error("Member not found");
    }

    if (req.user.role === "member") {
      const isOwn =
        req.user.memberProfile?.toString() === member._id.toString();
      if (!isOwn) {
        res.status(403);
        throw new Error("You can only edit your own profile");
      }
      // Fields a member cannot self-modify
      delete req.body.academicRole;
      delete req.body.user;
      delete req.body.phdDegreeVerified;
      delete req.body.phdDegreeVerifiedAt;
      delete req.body.phdDegreeVerifiedBy;
    }

    const updated = await Member.findByIdAndUpdate(req.params.id, req.body, {
      new:           true,
      runValidators: true,
    });

    res.status(200).json({ success: true, message: "Member updated", data: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete a member and remove them from all teams (admin only)
 * @route   DELETE /api/members/:id
 * @access  Private — admin
 */
const deleteMember = async (req, res, next) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      res.status(404);
      throw new Error("Member not found");
    }

    await Team.updateMany(
      { teamMembers: member._id },
      { $pull: { teamMembers: member._id } }
    );

    await member.deleteOne();
    res.status(200).json({ success: true, message: "Member deleted" });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    PhD Progress Tracker — PhD students with thesis data
 * @route   GET /api/members/phd-tracker
 * @access  Public
 */
const getPhdTracker = async (req, res, next) => {
  try {
    const students = await Member.find({
      academicRole: "PhD Student",
      thesisTitle:  { $nin: ["", null] },
    }).select(
      "fullName thesisTitle thesisStartDate thesisExpectedEnd thesisProgress thesisPhase photoUrl specialization phdDegreeVerified"
    );

    res.status(200).json({ success: true, count: students.length, data: students });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Member uploads (or updates) their PhD degree URL.
 *          The actual file upload happens on the frontend (e.g. to Cloudinary
 *          or S3). The frontend then sends the resulting public URL here.
 *          Uploading a new URL resets the verification status back to false
 *          so the admin must re-verify the new document.
 *
 * @route   PUT /api/members/:id/phd-degree
 * @access  Private — admin | member (own profile only)
 * @body    { phdDegreeUrl: "https://..." }
 */
const uploadPhdDegree = async (req, res, next) => {
  try {
    const { phdDegreeUrl } = req.body;

    if (!phdDegreeUrl || !phdDegreeUrl.trim()) {
      res.status(400);
      throw new Error("phdDegreeUrl is required");
    }

    const member = await Member.findById(req.params.id);
    if (!member) {
      res.status(404);
      throw new Error("Member not found");
    }

    // Members can only update their own profile
    if (req.user.role === "member") {
      const isOwn =
        req.user.memberProfile?.toString() === member._id.toString();
      if (!isOwn) {
        res.status(403);
        throw new Error("You can only update your own PhD degree document");
      }
    }

    // Uploading a new document resets verification — admin must re-verify
    member.phdDegreeUrl        = phdDegreeUrl.trim();
    member.phdDegreeVerified   = false;
    member.phdDegreeVerifiedAt = null;
    member.phdDegreeVerifiedBy = null;
    await member.save();

    res.status(200).json({
      success: true,
      message: "PhD degree document uploaded. Pending admin verification.",
      data: {
        id:              member._id,
        fullName:        member.fullName,
        phdDegreeUrl:    member.phdDegreeUrl,
        phdDegreeVerified: member.phdDegreeVerified,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Admin verifies (or un-verifies) a member's PhD degree.
 *          The admin reviews the document at phdDegreeUrl and marks it
 *          as verified. Can also be used to revoke verification if the
 *          document turns out to be invalid.
 *
 * @route   PUT /api/members/:id/verify-degree
 * @access  Private — admin only
 * @body    { verified: true | false }
 */
const verifyPhdDegree = async (req, res, next) => {
  try {
    const { verified } = req.body;

    if (typeof verified !== "boolean") {
      res.status(400);
      throw new Error("'verified' must be true or false");
    }

    const member = await Member.findById(req.params.id);
    if (!member) {
      res.status(404);
      throw new Error("Member not found");
    }

    if (!member.phdDegreeUrl) {
      res.status(400);
      throw new Error("This member has not uploaded a PhD degree document yet");
    }

    member.phdDegreeVerified   = verified;
    member.phdDegreeVerifiedAt = verified ? new Date() : null;
    member.phdDegreeVerifiedBy = verified ? req.user._id : null;
    await member.save();

    res.status(200).json({
      success: true,
      message: verified
        ? "PhD degree verified successfully"
        : "PhD degree verification revoked",
      data: {
        id:                    member._id,
        fullName:              member.fullName,
        phdDegreeUrl:          member.phdDegreeUrl,
        phdDegreeVerified:     member.phdDegreeVerified,
        phdDegreeVerifiedAt:   member.phdDegreeVerifiedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  getPhdTracker,
  uploadPhdDegree,
  verifyPhdDegree,
};