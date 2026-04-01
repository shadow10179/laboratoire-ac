const User        = require("../models/User");
const Member      = require("../models/Member");
const Team        = require("../models/Team");
const Publication = require("../models/Publication");
const Department  = require("../models/Department");


//  ADMIN DASHBOARD


/**
 * @desc    Admin dashboard summary — one request returns everything the
 *          admin dashboard needs: stats, pending queues, progress bars,
 *          recent members.
 * @route   GET /api/dashboard/admin
 * @access  Private — admin
 */
const getAdminDashboard = async (req, res, next) => {
  try {
    const [
      totalMembers,
      totalTeams,
      totalDepartments,
      approvedPubs,
      pendingPubs,
      rejectedPubs,
      pendingRegistrations,
      pendingPublications,
      teamsProgress,
      recentMembers,
    ] = await Promise.all([

      // Counts
      Member.countDocuments(),
      Team.countDocuments({ isActive: true }),
      Department.countDocuments({ isActive: true }),
      Publication.countDocuments({ approvalStatus: "approved" }),
      Publication.countDocuments({ approvalStatus: "pending" }),
      Publication.countDocuments({ approvalStatus: "rejected" }),

   
      User.find({ authStatus: "pending" })
        .sort({ createdAt: 1 })
        .limit(10)
        .select("name email createdAt role"),

      Publication.find({ approvalStatus: "pending" })
        .sort({ createdAt: 1 })
        .limit(10)
        .populate("team",        "teamName")
        .populate("submittedBy", "name email")
        .select("title authors year publisher team submittedBy createdAt"),

      // All active teams with their progress bars
      Team.find({ isActive: true })
        .populate("department", "name code")
        .populate("leaderId",   "fullName photoUrl")
        .select(
          "teamName researchProgress progressNote department leaderId teamMembers activeProjects"
        )
        .sort({ teamName: 1 }),

      // 5 most recently added members 
      Member.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("fullName academicRole specialization photoUrl faculty age createdAt"),
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalMembers,
          totalTeams,
          totalDepartments,
          publications: {
            approved: approvedPubs,
            pending:  pendingPubs,
            rejected: rejectedPubs,
            total:    approvedPubs + pendingPubs + rejectedPubs,
          },
          pendingRegistrationsCount: pendingRegistrations.length,
          pendingPublicationsCount:  pendingPublications.length,
        },
        pendingRegistrations,   // member approval queue
        pendingPublications,    // publication approval queue
        teamsProgress,          // progress bars for every team
        recentMembers,          // latest additions
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Full member list for the admin member-management view.
 *          Returns name, age, faculty, academic role, team, account status.
 *          ?academicRole=  ?faculty=  ?page=  ?limit=
 * @route   GET /api/dashboard/admin/members
 * @access  Private — admin
 */
const getAdminMembersList = async (req, res, next) => {
  try {
    const { academicRole, faculty, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (academicRole) filter.academicRole = academicRole;
    if (faculty)      filter.faculty = { $regex: faculty, $options: "i" };

    const skip = (Number(page) - 1) * Number(limit);

    const [members, total] = await Promise.all([
      Member.find(filter)
        .populate("user", "email role authStatus lastLogin isActive")
        .sort({ fullName: 1 })
        .skip(skip)
        .limit(Number(limit))
        .select(
          "fullName email age faculty academicRole specialization photoUrl bio " +
          "linkedIn googleScholar thesisTitle thesisProgress thesisPhase user createdAt"
        ),
      Member.countDocuments(filter),
    ]);

    // Enrich each member with their current team
    const enriched = await Promise.all(
      members.map(async (m) => {
        const team = await Team.findOne({ teamMembers: m._id })
          .select("teamName department")
          .populate("department", "name code");
        return { ...m.toObject(), team: team ?? null };
      })
    );

    res.status(200).json({
      success:     true,
      count:       enriched.length,
      total,
      totalPages:  Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      data:        enriched,
    });
  } catch (err) {
    next(err);
  }
};


//  HEAD OF LAB DASHBOARD


/**
 * @desc    Head-of-lab dashboard — high-level read-only overview.
 *          Returns: global stats, every department with its teams nested
 *          inside, and a flat list of all teams for the global progress view.
 * @route   GET /api/dashboard/head
 * @access  Private — head_of_lab | admin
 */
const getHeadDashboard = async (req, res, next) => {
  try {
    const [
      totalMembers,
      totalTeams,
      totalDepartments,
      totalPublications,
      departments,
      allTeamsProgress,
    ] = await Promise.all([
      Member.countDocuments(),
      Team.countDocuments({ isActive: true }),
      Department.countDocuments({ isActive: true }),
      Publication.countDocuments({ approvalStatus: "approved" }),

      // All departments (we will nest teams inside below)
      Department.find({ isActive: true })
        .populate("headOfDepartment", "fullName academicRole photoUrl")
        .sort({ name: 1 }),

      // Flat list of all teams — used for the global progress bar overview
      Team.find({ isActive: true })
        .populate("department", "name code")
        .populate("leaderId",   "fullName photoUrl")
        .select(
          "teamName researchProgress progressNote department leaderId teamMembers activeProjects tags"
        )
        .sort({ teamName: 1 }),
    ]);

    // Nest teams (with member details) inside their department
    const departmentsWithTeams = await Promise.all(
      departments.map(async (dept) => {
        const teams = await Team.find({ department: dept._id, isActive: true })
          .populate(
            "teamMembers",
            "fullName academicRole specialization photoUrl age faculty"
          )
          .populate("leaderId", "fullName photoUrl")
          .select(
            "teamName leaderName researchFocus researchProgress progressNote " +
            "teamMembers activeProjects tags leaderId"
          )
          .sort({ teamName: 1 });

        const memberCount = teams.reduce((acc, t) => acc + t.teamMembers.length, 0);

        return {
          ...dept.toObject(),
          teams,
          teamCount: teams.length,
          memberCount,
        };
      })
    );

    // Average research progress across all teams
    const avgProgress =
      allTeamsProgress.length > 0
        ? Math.round(
            allTeamsProgress.reduce((s, t) => s + t.researchProgress, 0) /
              allTeamsProgress.length
          )
        : 0;

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalMembers,
          totalTeams,
          totalDepartments,
          totalPublications,
          averageResearchProgress: avgProgress,
        },
        departments: departmentsWithTeams, // hierarchy: dept → teams → members
        allTeamsProgress,                  // flat list for the global progress panel
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Full member list for the head-of-lab members view.
 *          ?academicRole=  ?page=  ?limit=
 * @route   GET /api/dashboard/head/members
 * @access  Private — head_of_lab | admin
 */
const getHeadMembersList = async (req, res, next) => {
  try {
    const { academicRole, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (academicRole) filter.academicRole = academicRole;

    const skip = (Number(page) - 1) * Number(limit);

    const [members, total] = await Promise.all([
      Member.find(filter)
        .sort({ fullName: 1 })
        .skip(skip)
        .limit(Number(limit))
        .select(
          "fullName email age faculty academicRole specialization photoUrl bio " +
          "linkedIn googleScholar thesisTitle thesisProgress thesisPhase"
        ),
      Member.countDocuments(filter),
    ]);

    // Attach team + department info to each member
    const enriched = await Promise.all(
      members.map(async (m) => {
        const team = await Team.findOne({ teamMembers: m._id })
          .select("teamName researchProgress department")
          .populate("department", "name code");
        return { ...m.toObject(), team: team ?? null };
      })
    );

    res.status(200).json({
      success:     true,
      count:       enriched.length,
      total,
      totalPages:  Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      data:        enriched,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAdminDashboard,
  getAdminMembersList,
  getHeadDashboard,
  getHeadMembersList,
};