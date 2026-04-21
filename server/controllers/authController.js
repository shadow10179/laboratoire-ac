const User   = require("../models/User");
const Member = require("../models/Member");

// ── Internal helper ───────────────────────────────────────────────────────────
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJWT();
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id:            user._id,
      name:          user.name,
      email:         user.email,
      role:          user.role,
      authStatus:    user.authStatus,
      memberProfile: user.memberProfile ?? null,
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
//  PUBLIC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Member self-registration.
 *          Account starts as "pending" — admin must approve before login.
 *
 *          The frontend (Register.jsx) collects:
 *            - name, email, password       (required)
 *            - title (academicRole)        (optional)
 *            - degree: { name, data }      (base64 PDF object — stored in
 *                                           _registrationMeta.degree so the
 *                                           admin can preview it in an <iframe>
 *                                           without any cloud storage)
 *
 *          Visitors do NOT register — they browse the public site freely.
 *
 * @route   POST /api/auth/register
 * @access  Public
 * @body    {
 *            name, email, password,                  ← required
 *            title,                                  ← frontend "Title" selector
 *            academicRole, specialization,           ← alternative keys accepted
 *            age, faculty,
 *            degree: { name: string, data: string }  ← base64 PDF from frontend
 *          }
 */
const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      // The frontend sends "title" for the academic role selection
      title,
      academicRole,
      specialization,
      age,
      faculty,
      // Base64 degree PDF uploaded at registration:  { name: "file.pdf", data: "data:application/pdf;base64,..." }
      degree,
    } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error("Please provide name, email and password");
    }

    const exists = await User.findOne({ email });
    if (exists) {
      res.status(400);
      throw new Error("An account with this email already exists");
    }

    // "title" (from the frontend's Title selector) maps to academicRole
    const resolvedAcademicRole = title || academicRole || "";

    await User.create({
      name,
      email,
      password,
      role:       "member",
      authStatus: "pending",
      _registrationMeta: {
        academicRole:   resolvedAcademicRole,
        specialization: specialization || "",
        age:            age            || null,
        faculty:        faculty        || "",
        // Store the degree object as-is so the admin can render it in an iframe
        degree: degree
          ? { name: degree.name || "", data: degree.data || "" }
          : { name: "", data: "" },
      },
    });

    // No token is issued — the member must wait for admin approval.
    res.status(201).json({
      success: true,
      message:
        "Registration submitted successfully. Your account and degree document are awaiting admin review. You will be notified once approved.",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Login — only "approved" accounts receive a JWT.
 *          Visitors do not log in; they browse the public site freely.
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error("Please provide email and password");
    }

    // password is excluded by default — must re-select it
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    if (!user.isActive) {
      res.status(403);
      throw new Error("Account deactivated — contact an administrator");
    }

    if (user.authStatus === "pending") {
      res.status(403);
      throw new Error("Your registration is pending admin approval");
    }

    if (user.authStatus === "rejected") {
      const reason = user.rejectionReason
        ? `: ${user.rejectionReason}`
        : " — contact an administrator";
      res.status(403);
      throw new Error(`Your registration was rejected${reason}`);
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  AUTHENTICATED — any approved user
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Get own profile
 * @route   GET /api/auth/me
 * @access  Private — any logged-in user
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate(
      "memberProfile",
      "fullName academicRole specialization photoUrl bio linkedIn googleScholar age faculty phdDegreeUrl phdDegreeVerified phdDegreeVerifiedAt"
    );
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update own name / email / password
 * @route   PUT /api/auth/me
 * @access  Private — any logged-in user
 */
const updateMe = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const user = await User.findById(req.user.id).select("+password");

    if (name) user.name = name;
    if (email) {
      const taken = await User.findOne({ email, _id: { $ne: user._id } });
      if (taken) {
        res.status(400);
        throw new Error("Email already in use by another account");
      }
      user.email = email;
    }
    if (password) {
      if (password.length < 6) {
        res.status(400);
        throw new Error("Password must be at least 6 characters");
      }
      user.password = password; // pre-save hook hashes it
    }

    await user.save();
    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN — registration approval queue
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Get all pending registrations (oldest first).
 *          Returns _registrationMeta so the admin can see the submitted
 *          academic role and preview the degree PDF in an <iframe> using
 *          the base64 data stored in _registrationMeta.degree.data.
 * @route   GET /api/auth/pending
 * @access  Private — admin
 */
const getPendingRegistrations = async (req, res, next) => {
  try {
    const pending = await User.find({ authStatus: "pending" })
      .sort({ createdAt: 1 })
      .select("-password");

    res.status(200).json({ success: true, count: pending.length, data: pending });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Approve a pending member registration.
 *
 *          Flow:
 *          1. Mark the User as approved.
 *          2a. If memberProfileId provided → link to an existing Member doc.
 *          2b. Otherwise → auto-create a Member doc from _registrationMeta.
 *          3. Clear _registrationMeta from the User doc (degree already stored,
 *             no need to keep the base64 blob on the User document forever).
 *
 * @route   PUT /api/auth/approve/:id
 * @access  Private — admin
 * @body    {
 *            memberProfileId?,   ← link to existing Member instead of creating
 *            academicRole?,      ← override registration meta if needed
 *            specialization?,
 *            age?,
 *            faculty?
 *          }
 */
const approveRegistration = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }
    if (user.authStatus !== "pending") {
      res.status(400);
      throw new Error(`User is already '${user.authStatus}'`);
    }

    const {
      memberProfileId,
      academicRole,
      specialization,
      age,
      faculty,
    } = req.body;

    const meta = user._registrationMeta || {};

    user.authStatus = "approved";
    user.role       = "member";

    if (memberProfileId) {
      // Link to an existing Member document
      const member = await Member.findById(memberProfileId);
      if (!member) {
        res.status(404);
        throw new Error("Member profile not found");
      }
      user.memberProfile = member._id;
      await Member.findByIdAndUpdate(member._id, { user: user._id });
    } else {
      // Auto-create a Member profile from registration meta.
      const member = await Member.create({
        user:           user._id,
        fullName:       user.name,
        email:          user.email,
        academicRole:   academicRole   || meta.academicRole   || "Researcher",
        specialization: specialization || meta.specialization || "",
        age:            age            ?? meta.age            ?? null,
        faculty:        faculty        || meta.faculty        || "",
        // The degree is stored in _registrationMeta as base64 for admin preview.
        // We do NOT copy it to phdDegreeUrl (which expects a public URL).
        // The admin can later upload a hosted URL via PUT /api/members/:id/phd-degree.
      });
      user.memberProfile = member._id;
    }

    // Clear the registration meta to free up storage (degree blob can be large)
    user._registrationMeta = undefined;

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: `Registration approved for ${user.name}`,
      data: {
        id:            user._id,
        name:          user.name,
        email:         user.email,
        role:          user.role,
        authStatus:    user.authStatus,
        memberProfile: user.memberProfile,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Reject a pending member registration
 * @route   PUT /api/auth/reject/:id
 * @access  Private — admin
 * @body    { reason?: string }
 */
const rejectRegistration = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }
    if (user.authStatus !== "pending") {
      res.status(400);
      throw new Error(`User is already '${user.authStatus}'`);
    }

    user.authStatus      = "rejected";
    user.rejectionReason = req.body.reason || "";
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: `Registration rejected for ${user.name}`,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN — full user management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    List all users with optional filters
 * @route   GET /api/auth/users?role=&authStatus=
 * @access  Private — admin
 */
const getUsers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.role)       filter.role       = req.query.role;
    if (req.query.authStatus) filter.authStatus = req.query.authStatus;

    const users = await User.find(filter)
      .populate("memberProfile", "fullName academicRole specialization age faculty phdDegreeUrl phdDegreeVerified")
      .sort({ createdAt: -1 })
      .select("-password");

    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get one user by ID
 * @route   GET /api/auth/users/:id
 * @access  Private — admin
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("memberProfile", "fullName academicRole specialization photoUrl age faculty phdDegreeUrl phdDegreeVerified phdDegreeVerifiedAt phdDegreeVerifiedBy")
      .select("-password");

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create a user with a specific role directly.
 *          Used by the admin to create admin, head_of_lab, team_leader
 *          or member accounts that skip the approval flow.
 *          Visitors do NOT have accounts.
 * @route   POST /api/auth/users
 * @access  Private — admin
 * @body    { name, email, password, role, memberProfileId? }
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, memberProfileId } = req.body;

    if (!name || !email || !password || !role) {
      res.status(400);
      throw new Error("name, email, password and role are all required");
    }

    // Valid roles — "team_leader" added to support the frontend My Work page
    if (!["admin", "head_of_lab", "member", "team_leader"].includes(role)) {
      res.status(400);
      throw new Error("role must be one of: admin, head_of_lab, member, team_leader");
    }

    const exists = await User.findOne({ email });
    if (exists) {
      res.status(400);
      throw new Error("An account with this email already exists");
    }

    let memberProfile = null;
    if ((role === "member" || role === "team_leader") && memberProfileId) {
      const member = await Member.findById(memberProfileId);
      if (!member) {
        res.status(404);
        throw new Error("Member profile not found");
      }
      memberProfile = member._id;
    }

    // Admin-created accounts bypass the approval flow
    const user = await User.create({
      name,
      email,
      password,
      role,
      authStatus: "approved",
      memberProfile,
    });

    if (memberProfile) {
      await Member.findByIdAndUpdate(memberProfile, { user: user._id });
    }

    res.status(201).json({
      success: true,
      message: `User created with role '${role}'`,
      data: {
        id:            user._id,
        name:          user.name,
        email:         user.email,
        role:          user.role,
        authStatus:    user.authStatus,
        memberProfile: user.memberProfile,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update a user's role / active status / member profile link
 * @route   PUT /api/auth/users/:id
 * @access  Private — admin
 */
const updateUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id.toString()) {
      res.status(400);
      throw new Error("Use PUT /api/auth/me to update your own account");
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    const { role, isActive, authStatus, memberProfileId } = req.body;

    if (role) {
      if (!["admin", "head_of_lab", "member", "team_leader"].includes(role)) {
        res.status(400);
        throw new Error("role must be one of: admin, head_of_lab, member, team_leader");
      }
      user.role = role;
    }
    if (authStatus)                    user.authStatus = authStatus;
    if (typeof isActive === "boolean") user.isActive   = isActive;

    // Re-link or unlink a Member profile
    if (memberProfileId !== undefined) {
      if (user.memberProfile) {
        await Member.findByIdAndUpdate(user.memberProfile, { user: null });
      }
      if (memberProfileId === null) {
        user.memberProfile = null;
      } else {
        const member = await Member.findById(memberProfileId);
        if (!member) {
          res.status(404);
          throw new Error("Member profile not found");
        }
        user.memberProfile = member._id;
        await Member.findByIdAndUpdate(member._id, { user: user._id });
      }
    }

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: "User updated",
      data: {
        id:            user._id,
        name:          user.name,
        email:         user.email,
        role:          user.role,
        authStatus:    user.authStatus,
        isActive:      user.isActive,
        memberProfile: user.memberProfile,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete a user account
 * @route   DELETE /api/auth/users/:id
 * @access  Private — admin
 */
const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id.toString()) {
      res.status(400);
      throw new Error("You cannot delete your own account");
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    if (user.memberProfile) {
      await Member.findByIdAndUpdate(user.memberProfile, { user: null });
    }

    await user.deleteOne();
    res.status(200).json({ success: true, message: "User deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateMe,
  getPendingRegistrations,
  approveRegistration,
  rejectRegistration,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};