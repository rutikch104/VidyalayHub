#!/usr/bin/env node
/**
 * Seed Vidyalaya Hub with ~200 users + a realistic network graph so the
 * My Network module, recommendations, discovery, search, and connection
 * flows can be tested end-to-end.
 *
 * Distribution: 100 students / 50 alumni / 50 teachers, all on the same
 * approved tenant (RC Patel by default — overridable via SEED_TENANT_SLUG).
 *
 * Network targets (best-effort, idempotent):
 *   ≥ 500 accepted connections
 *   ≥ 100 pending RECEIVED invitations across hub users
 *   ≥ 100 pending SENT invitations across hub users
 *   ≥ 300 follow relationships
 *   30+ posts with light comments + likes for trending/feed signal
 *
 * Run:
 *   node scripts/seed/seedNetworkPopulation.js
 *   npm run seed:network
 *
 * Env:
 *   SEED_TENANT_SLUG               default: best-guess approved tenant
 *   SEED_DEMO_PASSWORD             default: Demo@12345
 *   SEED_NETWORK_USER_COUNT        default: 200 (totals split 100/50/50)
 *   SEED_NETWORK_TARGET_USERS      comma-separated emails to act as "hub" users
 *                                  (receive/send extra invitations). Defaults
 *                                  to the first 5 students from the seeded set.
 *   SEED_NETWORK_SKIP_AVATARS      default: true — set false to fetch + upload
 *                                  Pexels avatars (slow, ~100s of network calls)
 *   SEED_NETWORK_SKIP_SOCIAL       default: false — set true to skip posts
 *   SEED_RNG_SEED                  default: 20260608 — deterministic persona gen
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const db = require('../../database/index');
const { request, signIn, registerUser, uploadAvatarFromUrl } = require('./apiClient');

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || 'Demo@12345';
const SKIP_AVATARS = String(process.env.SEED_NETWORK_SKIP_AVATARS ?? 'true').toLowerCase() === 'true';
const SKIP_SOCIAL = String(process.env.SEED_NETWORK_SKIP_SOCIAL ?? 'false').toLowerCase() === 'true';
const USER_COUNT = parseInt(process.env.SEED_NETWORK_USER_COUNT || '200', 10);
const RNG_SEED = parseInt(process.env.SEED_RNG_SEED || '20260608', 10);

// 100/50/50 default split; scales proportionally with USER_COUNT.
const STUDENT_COUNT = Math.round(USER_COUNT * 0.5);
const ALUMNI_COUNT = Math.round(USER_COUNT * 0.25);
const TEACHER_COUNT = USER_COUNT - STUDENT_COUNT - ALUMNI_COUNT;

const stats = {
  registered: 0,
  skipped: 0,
  approved: 0,
  enriched: 0,
  avatarsUploaded: 0,
  connectionsRequested: 0,
  connectionsAccepted: 0,
  pendingReceived: 0,
  pendingSent: 0,
  followsCreated: 0,
  posts: 0,
  comments: 0,
  likes: 0,
  errors: [],
};

function log(msg) {
  console.log(`[net-seed] ${msg}`);
}
function warn(msg) {
  console.warn(`[net-seed:warn] ${msg}`);
}

// ── Deterministic RNG (mulberry32) ──────────────────────────────────────
function makeRng(seed) {
  let t = seed >>> 0;
  return function rand() {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = makeRng(RNG_SEED);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const pickN = (arr, n) => {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) {
    const i = Math.floor(rng() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
};
const range = (n) => Array.from({ length: n }, (_, i) => i);

// ── Data banks ──────────────────────────────────────────────────────────
const FIRST_NAMES_M = [
  'Aarav', 'Aditya', 'Akash', 'Aman', 'Ankit', 'Arjun', 'Atharv', 'Bhavesh',
  'Chetan', 'Darshan', 'Devansh', 'Dhruv', 'Gaurav', 'Harsh', 'Harshad',
  'Hrishikesh', 'Ishan', 'Jay', 'Kabir', 'Karan', 'Kartik', 'Kunal', 'Manish',
  'Mihir', 'Mukesh', 'Naveen', 'Nikhil', 'Nishant', 'Omkar', 'Parth',
  'Pranav', 'Pratik', 'Pravin', 'Rahul', 'Rajat', 'Rakesh', 'Rohan',
  'Sahil', 'Sandeep', 'Sanjay', 'Saurabh', 'Shreyas', 'Siddharth', 'Sumit',
  'Tanmay', 'Tejas', 'Uday', 'Vikram', 'Vinay', 'Yash',
];
const FIRST_NAMES_F = [
  'Aarti', 'Aditi', 'Akanksha', 'Ananya', 'Anjali', 'Anushka', 'Apurva',
  'Asha', 'Bhavna', 'Deepika', 'Diya', 'Esha', 'Gauri', 'Geeta', 'Hema',
  'Isha', 'Janhavi', 'Jyoti', 'Kavya', 'Khushi', 'Komal', 'Madhuri',
  'Manisha', 'Meera', 'Mitali', 'Mrunal', 'Namrata', 'Neha', 'Nikita',
  'Nisha', 'Pallavi', 'Pooja', 'Prachi', 'Pranjal', 'Prerna', 'Priya',
  'Radhika', 'Rashmi', 'Riya', 'Rutuja', 'Sakshi', 'Sanika', 'Shruti',
  'Snehal', 'Sneha', 'Swati', 'Tanvi', 'Trupti', 'Vaidehi', 'Vaishnavi',
];
const LAST_NAMES = [
  'Chaudhari', 'Patil', 'Sharma', 'Verma', 'Singh', 'Joshi', 'Desai',
  'Kulkarni', 'Bhosale', 'Pawar', 'Jadhav', 'Salunkhe', 'Shinde', 'More',
  'Kale', 'Gaikwad', 'Sawant', 'Mehta', 'Agarwal', 'Bhatt', 'Trivedi',
  'Bansal', 'Mishra', 'Yadav', 'Tiwari', 'Pandey', 'Iyer', 'Nair',
  'Reddy', 'Rao', 'Naidu', 'Chopra', 'Kapoor', 'Khan', 'Sayyed',
  'Borse', 'Patel', 'Suryawanshi', 'Mahajan', 'Wagh',
];

const BRANCHES = [
  { name: 'Computer Engineering', code: 'CE',
    skills: ['JavaScript', 'React', 'Node.js', 'Python', 'PostgreSQL', 'Git', 'Docker', 'AWS', 'TypeScript', 'GraphQL'] },
  { name: 'Information Technology', code: 'IT',
    skills: ['Linux', 'Networking', 'Python', 'Security', 'DevOps', 'AWS', 'Bash', 'Cloud', 'Ansible'] },
  { name: 'Mechanical Engineering', code: 'ME',
    skills: ['AutoCAD', 'SolidWorks', 'MATLAB', 'CAD', 'Robotics', 'ANSYS', 'CNC', 'Manufacturing'] },
  { name: 'Civil Engineering', code: 'CIV',
    skills: ['AutoCAD', 'STAAD Pro', 'Surveying', 'Concrete', 'Estimation', 'Project Management', 'BIM'] },
  { name: 'Electronics & Telecommunication', code: 'ENTC',
    skills: ['Embedded C', 'Arduino', 'VLSI', 'PCB Design', 'IoT', 'Signal Processing', 'MATLAB'] },
  { name: 'AI & Data Science', code: 'AIDS',
    skills: ['Python', 'Pandas', 'NumPy', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'NLP', 'Computer Vision', 'SQL'] },
];

const STUDENT_YEARS = [
  { year: 'FY',         semester: '1', admission_year: 2025, expected_grad: 2029 },
  { year: 'FY',         semester: '2', admission_year: 2025, expected_grad: 2029 },
  { year: 'SY',         semester: '3', admission_year: 2024, expected_grad: 2028 },
  { year: 'SY',         semester: '4', admission_year: 2024, expected_grad: 2028 },
  { year: 'TY',         semester: '5', admission_year: 2023, expected_grad: 2027 },
  { year: 'TY',         semester: '6', admission_year: 2023, expected_grad: 2027 },
  { year: 'Final Year', semester: '7', admission_year: 2022, expected_grad: 2026 },
  { year: 'Final Year', semester: '8', admission_year: 2022, expected_grad: 2026 },
];

const ALUMNI_COMPANIES = [
  ['Infosys',     'Software Engineer'],
  ['TCS',         'Systems Engineer'],
  ['Wipro',       'Cloud Consultant'],
  ['Accenture',   'Application Developer'],
  ['Cognizant',   'Software Engineer'],
  ['Capgemini',   'Senior Consultant'],
  ['LTI Mindtree','Full-Stack Developer'],
  ['Persistent',  'Backend Engineer'],
  ['Tech Mahindra','Data Engineer'],
  ['HCL',         'DevOps Engineer'],
  ['Amazon',      'SDE-1'],
  ['Microsoft',   'Software Engineer'],
  ['Flipkart',    'Software Engineer'],
  ['Razorpay',    'Backend Engineer'],
  ['Swiggy',      'Product Engineer'],
  ['Zoho',        'Member of Technical Staff'],
  ['Freshworks',  'Software Engineer'],
  ['ThoughtWorks','Application Developer'],
  ['Infosys BPM', 'Analyst'],
  ['JP Morgan',   'Associate Software Engineer'],
];

const TEACHER_DESIGNATIONS = [
  ['Lecturer',            8],
  ['Assistant Professor', 12],
  ['Associate Professor', 18],
  ['Professor',           24],
  ['HOD',                 28],
];

const QUALIFICATIONS = ['M.Tech', 'M.E.', 'M.Sc', 'Ph.D', 'Ph.D (Pursuing)'];

const CITIES = ['Shirpur', 'Dhule', 'Jalgaon', 'Nashik', 'Pune', 'Mumbai',
  'Aurangabad', 'Nagpur', 'Solapur', 'Kolhapur'];

// ── Persona generation ─────────────────────────────────────────────────
const usedEmails = new Set();
function genEmail(seedTag, idx) {
  // Use a stable tag so re-runs produce the same emails → idempotency.
  return `seed.${seedTag}${String(idx).padStart(3, '0')}@rcpit.demo`;
}
function genPhone(idx) {
  // Deterministic 10-digit mobile: 9 + 9-digit sequence.
  return `9${String(800000000 + idx * 13).slice(0, 9)}`;
}
function fullName(first, last) {
  return `${first} ${last}`;
}

function genStudents(count) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const isFemale = i % 2 === 1;
    const first = pick(isFemale ? FIRST_NAMES_F : FIRST_NAMES_M);
    const last = pick(LAST_NAMES);
    const branch = BRANCHES[i % BRANCHES.length];
    const yr = STUDENT_YEARS[i % STUDENT_YEARS.length];
    const email = genEmail('stu', i + 1);
    if (usedEmails.has(email)) continue;
    usedEmails.add(email);
    const skills = pickN(branch.skills, 3 + Math.floor(rng() * 3))
      .map((name) => ({ name, level: 5 + Math.floor(rng() * 5) }));
    out.push({
      userType: 'student',
      email,
      first_name: first,
      last_name: last,
      phone_number: genPhone(i),
      degree: 'B.Tech',
      branch: branch.name,
      academic_batch: `${yr.admission_year}-${yr.expected_grad}`,
      year: yr.year,
      semester: yr.semester,
      roll_number: `RCPIT${String(yr.admission_year).slice(-2)}${branch.code}${String(i + 1).padStart(3, '0')}`,
      division: ['A', 'B', 'C'][i % 3],
      admission_year: yr.admission_year,
      expected_graduation_year: yr.expected_grad,
      headline: `${yr.year} ${branch.name} student · ${pick(skills).name} enthusiast`,
      bio: `${branch.name} student exploring ${skills.slice(0, 2).map((s) => s.name).join(' and ')}. Active in campus tech community.`,
      location: `${pick(CITIES)}, Maharashtra`,
      skills,
      education: [{
        institution_name: 'R.C. Patel Institute of Technology',
        degree: 'B.Tech',
        field_of_study: branch.name,
        start_year: yr.admission_year,
        end_year: yr.expected_grad,
        cgpa: (7.0 + rng() * 2.5).toFixed(2),
      }],
    });
  }
  return out;
}

function genAlumni(count) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const isFemale = i % 3 === 1;
    const first = pick(isFemale ? FIRST_NAMES_F : FIRST_NAMES_M);
    const last = pick(LAST_NAMES);
    const branch = BRANCHES[i % BRANCHES.length];
    const gradYear = 2018 + (i % 7); // 2018..2024
    const admYear = gradYear - 4;
    const [company, position] = pick(ALUMNI_COMPANIES);
    const yearsExp = 2026 - gradYear;
    const email = genEmail('alm', i + 1);
    if (usedEmails.has(email)) continue;
    usedEmails.add(email);
    const skills = pickN(branch.skills, 4 + Math.floor(rng() * 3))
      .map((name) => ({ name, level: 6 + Math.floor(rng() * 4) }));
    out.push({
      userType: 'alumni',
      email,
      first_name: first,
      last_name: last,
      phone_number: genPhone(1000 + i),
      degree: 'B.Tech',
      branch: branch.name,
      academic_batch: `${admYear}-${gradYear}`,
      admission_year: admYear,
      graduation_year: gradYear,
      roll_number: `RCPIT${String(admYear).slice(-2)}${branch.code}${String(i + 1).padStart(3, '0')}`,
      company,
      position,
      headline: `${position} at ${company}`,
      bio: `${branch.name} alumnus (Class of ${gradYear}) · ${yearsExp}+ years in industry · Open to mentoring juniors.`,
      location: `${pick(CITIES)}, Maharashtra`,
      skills,
      education: [{
        institution_name: 'R.C. Patel Institute of Technology',
        degree: 'B.Tech',
        field_of_study: branch.name,
        start_year: admYear,
        end_year: gradYear,
        cgpa: (7.0 + rng() * 2.5).toFixed(2),
      }],
      experience: [{
        title: position,
        company,
        description: `${position} working on enterprise-scale systems at ${company}.`,
        start_year: gradYear,
        is_current_role: true,
      }],
    });
  }
  return out;
}

function genTeachers(count) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const isFemale = i % 4 === 1;
    const first = pick(isFemale ? FIRST_NAMES_F : FIRST_NAMES_M);
    const last = pick(LAST_NAMES);
    const branch = BRANCHES[i % BRANCHES.length];
    const [designation, yearsExp] = pick(TEACHER_DESIGNATIONS);
    const joiningYear = 2026 - Math.max(2, yearsExp - Math.floor(rng() * 5));
    const qualification = pick(QUALIFICATIONS);
    const email = genEmail('tch', i + 1);
    if (usedEmails.has(email)) continue;
    usedEmails.add(email);
    const skills = pickN(branch.skills, 4 + Math.floor(rng() * 3))
      .map((name) => ({ name, level: 7 + Math.floor(rng() * 3) }));
    out.push({
      userType: 'teacher',
      email,
      first_name: `Prof. ${first}`,
      last_name: last,
      phone_number: genPhone(2000 + i),
      department: branch.name,
      designation,
      employee_id: `RCPITFAC${String(i + 1).padStart(3, '0')}`,
      faculty_id: `FAC${branch.code}${String(i + 1).padStart(3, '0')}`,
      qualification,
      specialization: `${branch.name} — ${pick(skills).name}`,
      joining_date: `${joiningYear}-07-01`,
      headline: `${designation} · ${branch.name} · ${qualification}`,
      bio: `${qualification} qualified ${designation} at R.C. Patel Institute of Technology. Specialisation: ${branch.name}. ${yearsExp}+ years of teaching experience.`,
      location: `${pick(CITIES)}, Maharashtra`,
      skills,
      education: [{
        institution_name: 'Savitribai Phule Pune University',
        degree: qualification,
        field_of_study: branch.name,
        start_year: joiningYear - yearsExp - 3,
        end_year: joiningYear - yearsExp,
        cgpa: (7.5 + rng() * 2.0).toFixed(2),
      }],
    });
  }
  return out;
}

// ── Registration + approval (mirrors existing seedDemoEnvironment) ─────
async function resolveTenant() {
  const preferred = [
    /r\.?\s*c\.?\s*patel/i,
    /^rcpit$/i,
  ];
  const tenants = await db.Tenant.findAll({
    where: { status: 'approved' },
    attributes: ['tenant_id', 'name', 'slug'],
  });
  if (!tenants.length) throw new Error('No approved colleges found.');
  if (process.env.SEED_TENANT_SLUG) {
    const m = tenants.find((t) => t.slug === process.env.SEED_TENANT_SLUG);
    if (!m) throw new Error(`SEED_TENANT_SLUG ${process.env.SEED_TENANT_SLUG} not found.`);
    return m.get({ plain: true });
  }
  for (const re of preferred) {
    const m = tenants.find((t) => re.test(t.name) || re.test(t.slug || ''));
    if (m) return m.get({ plain: true });
  }
  return tenants[0].get({ plain: true });
}

async function approveUserRow(userId) {
  await db.User.update(
    { is_approved: true, registration_status: 'approved', registration_reviewed_at: new Date() },
    { where: { id: userId } },
  );
  stats.approved += 1;
}

function buildRegistrationPayload(p) {
  const base = {
    user_type: p.userType,
    email: p.email,
    password: DEMO_PASSWORD,
    password_confirm: DEMO_PASSWORD,
    first_name: p.first_name,
    last_name: p.last_name,
    phone_number: p.phone_number,
  };
  if (p.userType === 'student') {
    return { ...base, degree: p.degree, branch: p.branch, academic_batch: p.academic_batch,
      year: p.year, semester: p.semester, roll_number: p.roll_number, division: p.division,
      admission_year: p.admission_year, expected_graduation_year: p.expected_graduation_year };
  }
  if (p.userType === 'alumni') {
    return { ...base, degree: p.degree, branch: p.branch, admission_year: p.admission_year,
      graduation_year: p.graduation_year, roll_number: p.roll_number };
  }
  return { ...base, department: p.department, designation: p.designation,
    employee_id: p.employee_id, faculty_id: p.faculty_id, qualification: p.qualification,
    specialization: p.specialization, joining_date: p.joining_date };
}

async function registerAndApprove(p, tenant) {
  const existing = await db.User.findOne({ where: { email: p.email.toLowerCase() } });
  if (existing) {
    stats.skipped += 1;
    if (!existing.is_approved) await approveUserRow(existing.id);
    return { id: existing.id, email: existing.email, skipped: true };
  }
  try {
    const res = await registerUser({ ...buildRegistrationPayload(p), tenant_id: tenant.tenant_id }, tenant.slug);
    if (res.skipped) {
      const row = await db.User.findOne({ where: { email: p.email.toLowerCase() } });
      stats.skipped += 1;
      if (row && !row.is_approved) await approveUserRow(row.id);
      return { id: row?.id, email: p.email, skipped: true };
    }
    if (!res.user?.id) throw new Error('Register returned no user.id');
    await approveUserRow(res.user.id);
    stats.registered += 1;
    return { id: res.user.id, email: p.email, skipped: false };
  } catch (e) {
    stats.errors.push(`register ${p.email}: ${e.message}`);
    return null;
  }
}

// ── Profile enrichment (lightweight) ───────────────────────────────────
async function enrichProfile(token, tenantSlug, p) {
  try {
    await request('PUT', '/users/profile/about', {
      token, tenantSlug,
      body: { bio: p.bio, headline: p.headline, location: p.location },
      expectStatus: 200,
    });
  } catch (e) {
    warn(`about ${p.email}: ${e.message}`);
  }

  try {
    await request('PUT', '/users/profile', {
      token, tenantSlug,
      body: {
        location: p.location,
        ...(p.userType === 'alumni' ? { company: p.company, position: p.position } : {}),
      },
      expectStatus: 200,
    });
  } catch (e) {
    warn(`profile ${p.email}: ${e.message}`);
  }

  if (!SKIP_AVATARS && p.photo) {
    try {
      const url = await uploadAvatarFromUrl(token, tenantSlug, p.photo);
      if (url) stats.avatarsUploaded += 1;
    } catch (e) {
      warn(`avatar ${p.email}: ${e.message}`);
    }
  }

  for (const s of p.skills || []) {
    try {
      await request('POST', '/users/profile/skills', {
        token, tenantSlug,
        body: { skill_name: s.name, level: s.level ?? 5 },
      });
    } catch {
      /* duplicate skill or rate-limit — ignore */
    }
  }
  for (const e of p.education || []) {
    try {
      await request('POST', '/users/profile/education', {
        token, tenantSlug,
        body: {
          institution_name: e.institution_name,
          degree: e.degree,
          field_of_study: e.field_of_study,
          cgpa: e.cgpa,
          start_month: e.start_month ?? 7,
          start_year: e.start_year,
          end_month: e.end_month ?? 5,
          end_year: e.end_year,
          is_current_studying: e.end_year >= 2026,
        },
      });
    } catch {
      /* ignore */
    }
  }
  for (const ex of p.experience || []) {
    try {
      await request('POST', '/users/profile/experience', {
        token, tenantSlug,
        body: {
          title: ex.title,
          company: ex.company,
          description: ex.description,
          start_month: ex.start_month ?? 6,
          start_year: ex.start_year,
          is_current_role: !!ex.is_current_role,
        },
      });
    } catch {
      /* ignore */
    }
  }
  stats.enriched += 1;
}

// ── Network graph ──────────────────────────────────────────────────────
async function sendConnect(sender, receiver, tenantSlug) {
  try {
    const { json, status } = await request('POST', '/connections/request', {
      token: sender.token,
      tenantSlug,
      body: { receiver_id: receiver.id, message: 'Hi, would love to connect!' },
    });
    if (status === 201 || status === 200) {
      stats.connectionsRequested += 1;
      return json?.data?.connection?.id || json?.data?.id || json?.connection_id || null;
    }
    return null;
  } catch (e) {
    if (!/already|exists|pending|self/i.test(e.message)) {
      stats.errors.push(`connect ${sender.email}→${receiver.email}: ${e.message}`);
    }
    return null;
  }
}

async function acceptConnect(receiver, connectionId, tenantSlug) {
  try {
    await request('PUT', `/connections/${connectionId}/accept`, {
      token: receiver.token, tenantSlug,
    });
    stats.connectionsAccepted += 1;
    return true;
  } catch (e) {
    stats.errors.push(`accept ${connectionId} as ${receiver.email}: ${e.message}`);
    return false;
  }
}

async function sendFollow(follower, target, tenantSlug) {
  try {
    await request('POST', `/connections/follow/${target.id}`, {
      token: follower.token, tenantSlug,
    });
    stats.followsCreated += 1;
  } catch (e) {
    if (!/already|self/i.test(e.message)) {
      stats.errors.push(`follow ${follower.email}→${target.email}: ${e.message}`);
    }
  }
}

/**
 * Build network graph with the target distribution. Strategy:
 *   • For each user (i): send 5 connection requests → accept ~70% of them.
 *     That yields users.length × 5 requests, ~3.5× accepted.
 *     With 200 users → 1000 requested, ~700 accepted (exceeds the 500 target).
 *   • Target "hub" users get an extra 25 pending-RECEIVED + 25 pending-SENT
 *     each (not accepted), so the network UI's pending sections render.
 *   • 300 random follows.
 */
async function buildNetworkGraph(users, hubs, tenantSlug) {
  const N = users.length;
  if (!N) return;

  // ── Accepted connections (main graph) ──
  for (let i = 0; i < N; i += 1) {
    const sender = users[i];
    if (!sender.token) continue;
    for (let k = 1; k <= 5; k += 1) {
      const receiver = users[(i + k * 7) % N];
      if (!receiver?.token || sender.id === receiver.id) continue;
      const connId = await sendConnect(sender, receiver, tenantSlug);
      // Accept ~70% — modulo trick keeps it deterministic.
      if (connId && ((i + k) % 10) < 7) {
        await acceptConnect(receiver, connId, tenantSlug);
      }
    }
  }

  // ── Extra pending invitations targeting hub users ──
  // For each hub, have many other users send requests we do NOT accept.
  for (const hub of hubs) {
    if (!hub?.token) continue;
    const senders = users.filter((u) => u.token && u.id !== hub.id).slice(0, 25);
    for (const sender of senders) {
      const connId = await sendConnect(sender, hub, tenantSlug);
      if (connId) stats.pendingReceived += 1;
    }

    // Hub sends invitations the recipients won't accept (separate batch)
    const targets = users.filter((u) => u.token && u.id !== hub.id).slice(25, 50);
    for (const target of targets) {
      const connId = await sendConnect(hub, target, tenantSlug);
      if (connId) stats.pendingSent += 1;
    }
  }

  // ── Follow graph (separate from connections) ──
  // 300 random pairs.
  const FOLLOW_COUNT = 300;
  for (let i = 0; i < FOLLOW_COUNT; i += 1) {
    const follower = users[i % N];
    const target = users[(i * 11 + 13) % N];
    if (!follower?.token || !target || follower.id === target.id) continue;
    await sendFollow(follower, target, tenantSlug);
  }
}

// ── Light social content (for trending / feed signal) ──────────────────
async function seedSocialActivity(users, tenantSlug) {
  if (SKIP_SOCIAL) return;
  const authors = users.filter((u) => u.token).slice(0, 30);
  if (!authors.length) return;

  const samplePosts = [
    'Wrapping up the campus hackathon project tonight! #CampusLife #Coding',
    'Just finished reading "Designing Data-Intensive Applications" — strong recommendation for any backend engineer. #LearningInPublic',
    'Calling all final-year students: we need volunteers for tech fest organizing committee. DM me. #TechFest #RCPIT',
    'New blog post on building real-time feeds with Postgres LISTEN/NOTIFY. Link in bio. #Backend',
    'Internship interview prep tomorrow — wish me luck! #Placements #InterviewPrep',
    'Anyone working on AI/ML capstone projects? Looking to brainstorm dataset ideas. #MachineLearning',
    'Reached top 50 in this weekend\'s CTF — first time! Such a learning experience. #CyberSecurity',
    'Posting my open-source contribution to a popular React library — small fix but feels great. #OpenSource',
    'Office hours moved to Thursdays 3–5pm this semester. #Faculty #Academics',
    'Excited to mentor freshers at this year\'s induction program. Pay it forward! #Mentorship',
  ];
  const hashtagSets = [
    ['CampusLife', 'Coding'],
    ['LearningInPublic', 'Engineering'],
    ['TechFest', 'RCPIT'],
    ['Backend', 'Postgres'],
    ['Placements', 'CareerPrep'],
    ['MachineLearning', 'AI'],
    ['CyberSecurity', 'CTF'],
    ['OpenSource', 'React'],
    ['Faculty', 'Academics'],
    ['Mentorship', 'Alumni'],
  ];

  const createdPosts = [];
  for (let i = 0; i < authors.length; i += 1) {
    const author = authors[i];
    const content = samplePosts[i % samplePosts.length];
    const hashtags = hashtagSets[i % hashtagSets.length];
    try {
      const form = new FormData();
      form.append('content', content);
      form.append('type', 'text');
      form.append('visibility', 'public');
      form.append('hashtags', JSON.stringify(hashtags));
      const { json } = await request('POST', '/posts', {
        token: author.token, tenantSlug, formData: form, expectStatus: 201,
      });
      const post = json?.data?.post || json?.data || json?.post;
      if (post?.id) {
        createdPosts.push({ post, author });
        stats.posts += 1;
      }
    } catch (e) {
      stats.errors.push(`post ${author.email}: ${e.message}`);
    }
  }

  const commentTexts = [
    'This is awesome — would love a deeper write-up.',
    'Congrats! Worked hard for this.',
    'Count me in for the volunteer team.',
    'Tag me if you publish that blog post.',
    'Best of luck — you got this!',
  ];

  for (let i = 0; i < createdPosts.length; i += 1) {
    const { post, author } = createdPosts[i];
    const commenters = users.filter((u) => u.token && u.id !== author.id).slice(i % 10, (i % 10) + 3);
    for (let j = 0; j < commenters.length; j += 1) {
      try {
        await request('POST', `/posts/${post.id}/comments`, {
          token: commenters[j].token, tenantSlug,
          body: { text: commentTexts[(i + j) % commentTexts.length] },
          expectStatus: 201,
        });
        stats.comments += 1;
      } catch (e) {
        if (!/duplicate/i.test(e.message)) {
          stats.errors.push(`comment on ${post.id}: ${e.message}`);
        }
      }
    }
    const likers = users.filter((u) => u.token && u.id !== author.id).slice(0, 8);
    for (const liker of likers) {
      try {
        await request('POST', `/posts/${post.id}/like`, { token: liker.token, tenantSlug });
        stats.likes += 1;
      } catch {
        /* duplicate like — ignore */
      }
    }
  }
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  log(`Starting network seed (${STUDENT_COUNT} students + ${ALUMNI_COUNT} alumni + ${TEACHER_COUNT} teachers)…`);
  log(`Avatars: ${SKIP_AVATARS ? 'SKIPPED (set SEED_NETWORK_SKIP_AVATARS=false to enable)' : 'enabled'}`);
  log(`Social activity: ${SKIP_SOCIAL ? 'SKIPPED' : 'enabled'}`);

  // 1) Health check
  const health = await fetch(`${process.env.SEED_BASE_URL || `http://127.0.0.1:${process.env.NODE_PORT || 3030}`}/api/health`);
  if (!health.ok) throw new Error('Backend not reachable. Start it first.');

  // 2) Tenant
  const tenant = await resolveTenant();
  const tenantSlug = tenant.slug;
  log(`Tenant: ${tenant.name} (${tenantSlug})`);

  // 3) Personas
  const personas = [
    ...genStudents(STUDENT_COUNT),
    ...genAlumni(ALUMNI_COUNT),
    ...genTeachers(TEACHER_COUNT),
  ];
  log(`Generated ${personas.length} personas. Registering…`);

  // 4) Register + approve
  const users = [];
  for (let i = 0; i < personas.length; i += 1) {
    const p = personas[i];
    const row = await registerAndApprove(p, tenant);
    if (row?.id) users.push({ ...p, ...row });
    if ((i + 1) % 25 === 0) log(`  …registered ${i + 1}/${personas.length}`);
  }
  log(`Registration phase done: ${stats.registered} new, ${stats.skipped} existing.`);

  // 5) Sign in everyone — collect JWT tokens
  log('Signing in seeded users to collect tokens…');
  for (let i = 0; i < users.length; i += 1) {
    const p = users[i];
    try {
      const { token, user } = await signIn(p.email, DEMO_PASSWORD, tenantSlug);
      p.token = token;
      p.id = user?.id || p.id;
    } catch (e) {
      stats.errors.push(`signin ${p.email}: ${e.message}`);
    }
    if ((i + 1) % 50 === 0) log(`  …signed in ${i + 1}/${users.length}`);
  }
  const withTokens = users.filter((u) => u.token);
  log(`Tokens acquired: ${withTokens.length}/${users.length}`);

  // 6) Profile enrichment
  log('Enriching profiles (about + skills + education)…');
  for (let i = 0; i < withTokens.length; i += 1) {
    await enrichProfile(withTokens[i].token, tenantSlug, withTokens[i]);
    if ((i + 1) % 25 === 0) log(`  …enriched ${i + 1}/${withTokens.length}`);
  }

  // 7) Pick hub users for pending-invitation hotspots
  const targetEmails = (process.env.SEED_NETWORK_TARGET_USERS || '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const hubs = targetEmails.length
    ? withTokens.filter((u) => targetEmails.includes(u.email.toLowerCase()))
    : withTokens.slice(0, 5); // first 5 seeded users
  log(`Hub users for pending invitations: ${hubs.map((h) => h.email).join(', ')}`);

  // 8) Network graph
  log('Building network graph (connections + invitations + follows)…');
  await buildNetworkGraph(withTokens, hubs, tenantSlug);

  // 9) Social activity for trending/feed signal
  await seedSocialActivity(withTokens, tenantSlug);

  // 10) Summary
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  Vidyalaya Hub — Network Population Seed Summary');
  console.log('══════════════════════════════════════════════════════');
  console.log(`  Tenant:                ${tenant.name} (${tenantSlug})`);
  console.log(`  Password (all users):  ${DEMO_PASSWORD}`);
  console.log(`  Registered (new):      ${stats.registered}`);
  console.log(`  Skipped (existed):     ${stats.skipped}`);
  console.log(`  Approved:              ${stats.approved}`);
  console.log(`  Profiles enriched:     ${stats.enriched}`);
  console.log(`  Avatars uploaded:      ${stats.avatarsUploaded}`);
  console.log(`  Connections sent:      ${stats.connectionsRequested}`);
  console.log(`  Connections accepted:  ${stats.connectionsAccepted}  ← target ≥ 500`);
  console.log(`  Pending RECEIVED:      ${stats.pendingReceived}  ← target ≥ 100 (across hub users)`);
  console.log(`  Pending SENT:          ${stats.pendingSent}  ← target ≥ 100 (from hub users)`);
  console.log(`  Follows created:       ${stats.followsCreated}  ← target ≥ 300`);
  console.log(`  Posts:                 ${stats.posts}`);
  console.log(`  Comments:              ${stats.comments}`);
  console.log(`  Likes:                 ${stats.likes}`);
  console.log(`  Errors:                ${stats.errors.length}`);
  if (stats.errors.length) {
    console.log('\n  First 10 errors:');
    stats.errors.slice(0, 10).forEach((e) => console.log(`    - ${e}`));
    if (stats.errors.length > 10) console.log(`    … and ${stats.errors.length - 10} more`);
  }
  if (hubs.length) {
    console.log('\n  Hub user logins (to see populated Network sections):');
    hubs.forEach((h) => console.log(`    ${h.email}  /  ${DEMO_PASSWORD}`));
  }
  console.log('══════════════════════════════════════════════════════\n');

  await db.sequelize.close();
  process.exit(stats.errors.length > 50 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('[net-seed:fatal]', err);
  try { await db.sequelize.close(); } catch { /* ignore */ }
  process.exit(1);
});
