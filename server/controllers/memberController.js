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
      .select("-__v")
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
    const member = await Member.findById(req.params.id).select("-__v");
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
 * @desc    Update a member
 *          admin  → can update any field on any member
 *          member → can only update their own linked profile;
 *                   cannot change academicRole or user back-reference
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
      // Strip fields a member cannot change on themselves
      delete req.body.academicRole;
      delete req.body.user;
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
      "fullName thesisTitle thesisStartDate thesisExpectedEnd thesisProgress thesisPhase photoUrl specialization"
    );

    res.status(200).json({ success: true, count: students.length, data: students });
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
};