/**
 * Database Seeder
 * ───────────────
 * node seeder.js           → wipe everything and import fresh sample data
 * node seeder.js --delete  → wipe all collections only
 *
 * Default accounts created
 * ────────────────────────
 *  admin@lab.dz          / admin123     (role: admin)
 *  head@lab.dz           / head123      (role: head_of_lab)
 *  member@lab.dz         / member123    (role: member,       linked to Prof. Karim Benali)
 *  leader@lab.dz         / leader123    (role: team_leader,  linked to Prof. Sonia Bouzid)
 *
 * Visitors browse the public site freely — no account needed.
 */

const dotenv = require("dotenv");
dotenv.config();

const connectDB   = require("./config/db");
const User        = require("./models/User");
const Member      = require("./models/Member");
const Department  = require("./models/Department");
const Team        = require("./models/Team");
const Publication = require("./models/Publication");
const News        = require("./models/News");

connectDB();

// ─────────────────────────────────────────────────────────────────────────────
//  SAMPLE DATA
// ─────────────────────────────────────────────────────────────────────────────

const departmentsData = [
  {
    name:        "Computer Science",
    code:        "CS",
    description: "Research in artificial intelligence, networks, cybersecurity, and software engineering.",
  },
  {
    name:        "Mathematics",
    code:        "MATH",
    description: "Pure and applied mathematics research including algebra, analysis, and statistics.",
  },
  {
    name:        "Physics",
    code:        "PHYS",
    description: "Theoretical and experimental physics research.",
  },
];

const membersData = [
  // ── Computer Science ────────────────────────────────────────────────────────
  {
    fullName:       "Prof. Karim Benali",
    email:          "k.benali@lab.dz",
    age:            52,
    faculty:        "Faculty of Science & Technology",
    academicRole:   "Professor",
    specialization: "Machine Learning & Computer Vision",
    bio:            "Pioneer in deep learning with 20+ years of experience.",
    linkedIn:       "https://linkedin.com/in/karimbenali",
    googleScholar:  "https://scholar.google.com/karimbenali",
  },
  {
    fullName:       "Dr. Amira Hadj",
    email:          "a.hadj@lab.dz",
    age:            38,
    faculty:        "Faculty of Science & Technology",
    academicRole:   "Doctor",
    specialization: "Natural Language Processing",
    bio:            "Expert in Arabic NLP and text classification.",
  },
  {
    fullName:          "Yacine Meziane",
    email:             "y.meziane@lab.dz",
    age:               28,
    faculty:           "Faculty of Science & Technology",
    academicRole:      "PhD Student",
    specialization:    "Federated Learning",
    thesisTitle:       "Privacy-Preserving Federated Learning in Healthcare Systems",
    thesisStartDate:   new Date("2022-09-01"),
    thesisExpectedEnd: new Date("2025-09-01"),
    thesisProgress:    65,
    thesisPhase:       "Research",
  },
  {
    fullName:       "Prof. Sonia Bouzid",
    email:          "s.bouzid@lab.dz",
    age:            47,
    faculty:        "Faculty of Science & Technology",
    academicRole:   "Professor",
    specialization: "Cybersecurity & Cryptography",
    bio:            "Head of the Security Research Group.",
  },
  {
    fullName:       "Dr. Omar Chikh",
    email:          "o.chikh@lab.dz",
    age:            35,
    faculty:        "Faculty of Science & Technology",
    academicRole:   "Doctor",
    specialization: "Blockchain Technology",
  },
  {
    fullName:          "Lina Khelif",
    email:             "l.khelif@lab.dz",
    age:               26,
    faculty:           "Faculty of Science & Technology",
    academicRole:      "PhD Student",
    specialization:    "Zero-Knowledge Proofs",
    thesisTitle:       "Efficient ZK-SNARK Constructions for Blockchain Privacy",
    thesisStartDate:   new Date("2023-01-15"),
    thesisExpectedEnd: new Date("2026-01-15"),
    thesisProgress:    30,
    thesisPhase:       "Literature Review",
  },
  // ── Mathematics ─────────────────────────────────────────────────────────────
  {
    fullName:       "Prof. Hassan Merabet",
    email:          "h.merabet@lab.dz",
    age:            55,
    faculty:        "Faculty of Mathematics",
    academicRole:   "Professor",
    specialization: "Algebraic Topology",
    bio:            "Leading researcher in algebraic topology and category theory.",
  },
  {
    fullName:          "Sara Bensalem",
    email:             "s.bensalem@lab.dz",
    age:               27,
    faculty:           "Faculty of Mathematics",
    academicRole:      "PhD Student",
    specialization:    "Applied Statistics",
    thesisTitle:       "Bayesian Methods for High-Dimensional Data Analysis",
    thesisStartDate:   new Date("2023-09-01"),
    thesisExpectedEnd: new Date("2026-09-01"),
    thesisProgress:    20,
    thesisPhase:       "Literature Review",
  },
];

// Teams — deptIndex and memberNames resolved dynamically
const teamsData = [
  {
    teamName:         "AI & Machine Learning Research Group",
    leaderName:       "Prof. Karim Benali",
    researchFocus:    "Deep Learning, Computer Vision, NLP",
    description:      "Cutting-edge AI solutions for Arabic language processing and medical imaging.",
    researchProgress: 70,
    progressNote:     "Arabic BERT model training complete; medical imaging pipeline in validation.",
    deptIndex:        0,
    memberNames:      ["Prof. Karim Benali", "Dr. Amira Hadj", "Yacine Meziane"],
    activeProjects: [
      {
        title:         "Arabic Sentiment Analysis at Scale",
        description:   "Large-scale sentiment analysis using transformer models on Algerian Arabic dialects.",
        startDate:     new Date("2023-03-01"),
        status:        "Active",
        fundingSource: "DGRSDT Algeria",
      },
      {
        title:         "Medical Image Segmentation",
        description:   "AI-assisted cancer detection in CT scans.",
        startDate:     new Date("2022-09-01"),
        status:        "Active",
        fundingSource: "WHO Research Grant",
      },
    ],
    tags: ["ai", "machine-learning", "nlp", "computer-vision", "arabic"],
  },
  {
    teamName:         "Cybersecurity & Blockchain Lab",
    leaderName:       "Prof. Sonia Bouzid",
    researchFocus:    "Cryptography, Blockchain, Network Security",
    description:      "Advancing digital security through cryptographic research and decentralised systems.",
    researchProgress: 45,
    progressNote:     "IoT framework prototype complete; ZK-SNARK integration ongoing.",
    deptIndex:        0,
    memberNames:      ["Prof. Sonia Bouzid", "Dr. Omar Chikh", "Lina Khelif"],
    activeProjects: [
      {
        title:         "Secure IoT Framework",
        description:   "Lightweight cryptography for IoT devices.",
        startDate:     new Date("2023-01-01"),
        status:        "Active",
        fundingSource: "Ministry of Digital Economy",
      },
    ],
    tags: ["security", "blockchain", "cryptography", "iot", "privacy"],
  },
  {
    teamName:         "Applied Mathematics & Statistics Group",
    leaderName:       "Prof. Hassan Merabet",
    researchFocus:    "Algebraic Topology, Bayesian Statistics, Data Analysis",
    description:      "Bridging pure mathematics and real-world data science applications.",
    researchProgress: 35,
    progressNote:     "Literature review phase complete; beginning experimental design.",
    deptIndex:        1,
    memberNames:      ["Prof. Hassan Merabet", "Sara Bensalem"],
    activeProjects: [
      {
        title:         "Bayesian Inference for Healthcare Data",
        description:   "Applying Bayesian methods to high-dimensional clinical datasets.",
        startDate:     new Date("2023-09-01"),
        status:        "Active",
        fundingSource: "National Science Foundation",
      },
    ],
    tags: ["mathematics", "statistics", "bayesian", "data-analysis"],
  },
];

// Publications — field name is now "type" (was publicationType)
const publicationsData = [
  {
    title:          "Arabic Text Classification Using BERT-Based Transformer Models: A Comparative Study",
    authors:        ["Karim Benali", "Amira Hadj", "Yacine Meziane"],
    year:           2024,
    publisher:      "IEEE Transactions on Neural Networks and Learning Systems",
    type:           "Journal Article",           // ← renamed from publicationType
    pdfLink:        "https://example.com/pub1.pdf",
    doi:            "10.1109/TNNLS.2024.1234567",
    abstract:       "A comparative study of BERT-based models for Arabic text classification achieving state-of-the-art results on multiple benchmarks.",
    tags:           ["nlp", "arabic", "bert", "ai"],
    citations:      12,
    approvalStatus: "approved",
    isPublished:    true,
    teamIndex:      0,
  },
  {
    title:          "Federated Learning with Differential Privacy for Medical Imaging",
    authors:        ["Yacine Meziane", "Karim Benali"],
    year:           2024,
    publisher:      "ICML Workshop on Healthcare AI",
    type:           "Conference Paper",          // ← renamed from publicationType
    pdfLink:        "https://example.com/pub2.pdf",
    abstract:       "A federated learning framework with differential privacy for training medical imaging models across distributed hospital networks.",
    tags:           ["federated-learning", "privacy", "machine-learning", "healthcare"],
    citations:      5,
    approvalStatus: "approved",
    isPublished:    true,
    teamIndex:      0,
  },
  {
    title:          "Zero-Knowledge Proofs for Scalable Blockchain Privacy: A Survey",
    authors:        ["Sonia Bouzid", "Lina Khelif", "Omar Chikh"],
    year:           2023,
    publisher:      "ACM Computing Surveys",
    type:           "Journal Article",           // ← renamed from publicationType
    pdfLink:        "https://example.com/pub3.pdf",
    doi:            "10.1145/ACM.2023.987654",
    abstract:       "A comprehensive survey of ZKP systems covering SNARKs, STARKs, and Bulletproofs and their applications in blockchain privacy.",
    tags:           ["blockchain", "privacy", "cryptography", "security"],
    citations:      28,
    approvalStatus: "approved",
    isPublished:    true,
    teamIndex:      1,
  },
  {
    title:          "Lightweight Cryptographic Protocols for Constrained IoT Devices",
    authors:        ["Omar Chikh", "Sonia Bouzid"],
    year:           2023,
    publisher:      "IEEE Internet of Things Journal",
    type:           "Journal Article",           // ← renamed from publicationType
    doi:            "10.1109/JIOT.2023.456789",
    abstract:       "A suite of lightweight cryptographic protocols for resource-constrained IoT devices balancing security and performance.",
    tags:           ["iot", "cryptography", "security", "lightweight"],
    citations:      19,
    approvalStatus: "approved",
    isPublished:    true,
    teamIndex:      1,
  },
  {
    // Pending — waiting for admin approval
    title:          "Topological Data Analysis for Medical Imaging",
    authors:        ["Hassan Merabet", "Sara Bensalem"],
    year:           2024,
    publisher:      "Journal of Applied Mathematics",
    type:           "Journal Article",           // ← renamed from publicationType
    abstract:       "Applying topological data analysis techniques to identify patterns in medical imaging datasets.",
    tags:           ["mathematics", "topology", "medical-imaging"],
    citations:      0,
    approvalStatus: "pending",
    isPublished:    false,
    teamIndex:      2,
  },
];

// News — uses "image" field (renamed from imageUrl in the model)
const newsData = [
  {
    headline:  "Lab Wins Best Paper Award at ICML 2024",
    date:      new Date("2024-07-15"),
    summary:   "Our federated learning research was recognised as best paper at ICML 2024.",
    fullStory: "We are proud to announce that our paper on Federated Learning with Differential Privacy for Medical Imaging received the Best Paper Award at the ICML 2024 Healthcare AI Workshop.",
    category:  "Award",
    author:    "Lab Admin",
    image:     "https://picsum.photos/seed/news1/600/300",   // ← field is now "image"
    tags:      ["award", "icml", "federated-learning"],
  },
  {
    headline:  "New Research Project Funded by DGRSDT",
    date:      new Date("2024-06-01"),
    summary:   "Our Arabic Sentiment Analysis project received a 3-year grant from the DGRSDT.",
    fullStory: "The Directorate General of Scientific Research and Technological Development has approved a 3-year research grant for the Arabic Sentiment Analysis at Scale project.",
    category:  "Announcement",
    author:    "Prof. Karim Benali",
    image:     "https://picsum.photos/seed/news2/600/300",
    tags:      ["funding", "arabic", "nlp", "dgrsdt"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
//  SEED
// ─────────────────────────────────────────────────────────────────────────────
const importData = async () => {
  try {
    console.log("\n🗑️   Clearing existing data...");
    await Promise.all([
      User.deleteMany(),
      Member.deleteMany(),
      Department.deleteMany(),
      Team.deleteMany(),
      Publication.deleteMany(),
      News.deleteMany(),
    ]);

    // 1. Departments
    console.log("🏛️   Seeding departments...");
    const createdDepts = await Department.insertMany(departmentsData);

    // 2. Members
    console.log("👥  Seeding members...");
    const createdMembers = await Member.insertMany(membersData);

    // Build name → ObjectId map
    const byName = {};
    createdMembers.forEach((m) => { byName[m.fullName] = m._id; });

    // 3. Teams — assign department, leader, and member IDs
    console.log("🏢  Seeding teams...");
    const teamsToInsert = teamsData.map((t) => {
      const { deptIndex, memberNames, ...rest } = t;
      return {
        ...rest,
        department:  createdDepts[deptIndex]._id,
        leaderId:    byName[t.leaderName] ?? null,
        teamMembers: memberNames.map((n) => byName[n]).filter(Boolean),
      };
    });
    const createdTeams = await Team.insertMany(teamsToInsert);

    // 4. User accounts
    console.log("🔐  Seeding user accounts...");

    const adminUser = await User.create({
      name:       "Lab Admin",
      email:      "admin@lab.dz",
      password:   "admin123",
      role:       "admin",
      authStatus: "approved",
    });

    await User.create({
      name:       "Head of Lab",
      email:      "head@lab.dz",
      password:   "head123",
      role:       "head_of_lab",
      authStatus: "approved",
    });

    // Member account → Prof. Karim Benali
    const karimProfile = createdMembers.find((m) => m.fullName === "Prof. Karim Benali");
    const memberUser = await User.create({
      name:          "Prof. Karim Benali",
      email:         "member@lab.dz",
      password:      "member123",
      role:          "member",
      authStatus:    "approved",
      memberProfile: karimProfile._id,
    });
    await Member.findByIdAndUpdate(karimProfile._id, { user: memberUser._id });

    // Team leader account → Prof. Sonia Bouzid (shows "My Work" in the frontend)
    const soniaProfile = createdMembers.find((m) => m.fullName === "Prof. Sonia Bouzid");
    const leaderUser = await User.create({
      name:          "Prof. Sonia Bouzid",
      email:         "leader@lab.dz",
      password:      "leader123",
      role:          "team_leader",
      authStatus:    "approved",
      memberProfile: soniaProfile._id,
    });
    await Member.findByIdAndUpdate(soniaProfile._id, { user: leaderUser._id });

    // 5. Publications
    console.log("📄  Seeding publications...");
    const pubsToInsert = publicationsData.map((p) => {
      const { teamIndex, ...rest } = p;
      return {
        ...rest,
        team:        createdTeams[teamIndex]._id,
        submittedBy: adminUser._id,
        ...(rest.approvalStatus === "approved" && {
          reviewedBy: adminUser._id,
          reviewedAt: new Date(),
        }),
      };
    });
    await Publication.insertMany(pubsToInsert);

    // 6. News
    console.log("📰  Seeding news...");
    await News.insertMany(newsData);

    console.log(`
✅  Seed complete!
   ${createdDepts.length}   departments
   ${createdMembers.length}   members
   ${createdTeams.length}   teams
   ${pubsToInsert.length}   publications  (${pubsToInsert.filter(p => p.approvalStatus === "approved").length} approved, ${pubsToInsert.filter(p => p.approvalStatus === "pending").length} pending)
   ${newsData.length}   news articles
   4   user accounts

 Login credentials
 ──────────────────────────────────────────────────────────
   admin@lab.dz    /  admin123    (admin)
   head@lab.dz     /  head123     (head_of_lab)
   member@lab.dz   /  member123   (member — Prof. Karim Benali)
   leader@lab.dz   /  leader123   (team_leader — Prof. Sonia Bouzid)

 Visitors browse the public site freely — no account needed.
`);
    process.exit(0);
  } catch (err) {
    console.error(" Seed error:", err.message);
    process.exit(1);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  DELETE
// ─────────────────────────────────────────────────────────────────────────────
const deleteData = async () => {
  try {
    await Promise.all([
      User.deleteMany(),
      Member.deleteMany(),
      Department.deleteMany(),
      Team.deleteMany(),
      Publication.deleteMany(),
      News.deleteMany(),
    ]);
    console.log(" All collections wiped");
    process.exit(0);
  } catch (err) {
    console.error(" Delete error:", err.message);
    process.exit(1);
  }
};

if (process.argv[2] === "--delete") {
  deleteData();
} else {
  importData();
}