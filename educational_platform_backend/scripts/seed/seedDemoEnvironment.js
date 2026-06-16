#!/usr/bin/env node
/**
 * Seed Vidyalaya Hub with realistic demo data for end-to-end UI/UX testing.
 *
 * Workflow:
 *   1. Register users via POST /api/auth/register (campus registration service)
 *   2. Approve pending registrations (same fields as PUT /api/admin/users/:id/status)
 *   3. Enrich profiles via authenticated user APIs
 *   4. Create posts, comments, connections, communities, events, notices
 *
 * Usage:
 *   node scripts/seed/seedDemoEnvironment.js
 *   npm run seed:demo
 *
 * Env:
 *   SEED_BASE_URL          API base (default http://127.0.0.1:3030/api)
 *   SEED_DEMO_PASSWORD     Password for all demo accounts (default Demo@12345)
 *   SEED_TENANT_SLUG       Override tenant slug
 *   SEED_SKIP_SOCIAL       Set true to skip posts/connections/communities
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const db = require('../../database/index');
const { createCampusRegistration } = require('../../services/campusRegistrationService');
const { DEMO_PASSWORD, students, alumni, teachers } = require('./demoUsersData');
const { request, signIn, registerUser, uploadAvatarFromUrl } = require('./apiClient');

const SKIP_SOCIAL = String(process.env.SEED_SKIP_SOCIAL || '').toLowerCase() === 'true';

const stats = {
  registered: 0,
  skipped: 0,
  approved: 0,
  profiles: 0,
  posts: 0,
  comments: 0,
  connections: 0,
  communities: 0,
  events: 0,
  notices: 0,
  errors: [],
};

function log(msg) {
  console.log(`[seed] ${msg}`);
}

function warn(msg) {
  console.warn(`[seed:warn] ${msg}`);
}

async function resolveTenant() {
  const preferred = [
    /r\.?\s*c\.?\s*patel/i,
    /rc\s*patel/i,
    /rajarambapu/i,
    /^rcpit$/i,
  ];

  const tenants = await db.Tenant.findAll({
    where: { status: 'approved' },
    attributes: ['tenant_id', 'name', 'slug'],
  });

  if (!tenants.length) throw new Error('No approved colleges found. Approve a tenant first.');

  if (process.env.SEED_TENANT_SLUG) {
    const bySlug = tenants.find((t) => t.slug === process.env.SEED_TENANT_SLUG);
    if (bySlug) return bySlug.get({ plain: true });
    throw new Error(`SEED_TENANT_SLUG=${process.env.SEED_TENANT_SLUG} not found among approved tenants.`);
  }

  for (const re of preferred) {
    const match = tenants.find((t) => re.test(t.name) || re.test(t.slug || ''));
    if (match) return match.get({ plain: true });
  }

  return tenants[0].get({ plain: true });
}

/** Mirrors PUT /api/admin/users/:userId/status { status: 'Active' } */
async function approveUser(userId) {
  await db.User.update(
    {
      is_approved: true,
      registration_status: 'approved',
      registration_reviewed_at: new Date(),
    },
    { where: { id: userId } },
  );
  stats.approved += 1;
}

function buildRegistrationPayload(userType, person) {
  const base = {
    user_type: userType,
    email: person.email,
    password: DEMO_PASSWORD,
    password_confirm: DEMO_PASSWORD,
    first_name: person.first_name,
    last_name: person.last_name,
    phone_number: person.phone_number,
  };

  if (userType === 'student') {
    return {
      ...base,
      degree: person.degree,
      branch: person.branch,
      academic_batch: person.academic_batch,
      year: person.year,
      semester: person.semester,
      roll_number: person.roll_number,
      division: person.division,
      admission_year: person.admission_year,
      expected_graduation_year: person.expected_graduation_year,
    };
  }

  if (userType === 'alumni') {
    return {
      ...base,
      degree: person.degree,
      branch: person.branch,
      admission_year: person.admission_year,
      graduation_year: person.graduation_year,
      roll_number: person.roll_number || undefined,
    };
  }

  return {
    ...base,
    department: person.department,
    designation: person.designation,
    employee_id: person.employee_id,
    faculty_id: person.faculty_id,
    qualification: person.qualification,
    specialization: person.specialization,
    joining_date: person.joining_date,
  };
}

async function registerAndApprove(userType, person, tenantId, tenantSlug) {
  const existing = await db.User.findOne({ where: { email: person.email.toLowerCase() } });
  if (existing) {
    stats.skipped += 1;
    if (!existing.is_approved) await approveUser(existing.id);
    return { id: existing.id, email: existing.email, skipped: true };
  }

  let user;
  try {
    const payload = buildRegistrationPayload(userType, person);
    const regRes = await registerUser({ ...payload, tenant_id: tenantId }, tenantSlug);
    if (regRes.skipped) {
      const row = await db.User.findOne({ where: { email: person.email.toLowerCase() } });
      stats.skipped += 1;
      if (row && !row.is_approved) await approveUser(row.id);
      return { id: row?.id, email: person.email, skipped: true };
    }
    user = regRes.user;
  } catch (apiErr) {
    log(`API register failed for ${person.email}, using campus service: ${apiErr.message}`);
    user = await createCampusRegistration({
      body: { ...buildRegistrationPayload(userType, person), tenant_id: tenantId },
      files: {},
      tenantId,
      needsCollegeApproval: true,
    });
    user = user?.get ? user.get({ plain: true }) : user;
  }

  if (!user?.id) throw new Error(`Registration failed for ${person.email}`);
  await approveUser(user.id);
  stats.registered += 1;
  log(`Registered & approved: ${person.first_name} ${person.last_name} (${userType})`);
  return { id: user.id, email: person.email, skipped: false };
}

async function enrichProfile(token, tenantSlug, person, userType) {
  const social = person.social || {};

  try {
    await request('PUT', '/users/profile/about', {
      token,
      tenantSlug,
      body: {
        bio: person.bio,
        headline: person.headline,
        location: person.location,
        website: social.website,
      },
      expectStatus: 200,
    });
  } catch (e) {
    warn(`About for ${person.email}: ${e.message}`);
  }

  try {
    await request('PUT', '/users/profile', {
      token,
      tenantSlug,
      body: {
        location: person.location,
        linkedin_url: social.linkedin,
        github_url: social.github,
        twitter_url: social.twitter,
        website_url: social.website,
        ...(userType === 'alumni'
          ? { company: person.company, position: person.position }
          : {}),
      },
      expectStatus: 200,
    });
  } catch (e) {
    warn(`Profile for ${person.email}: ${e.message}`);
  }

  if (person.photo) {
    await uploadAvatarFromUrl(token, tenantSlug, person.photo);
  }

  for (const skill of person.skills || []) {
    try {
      await request('POST', '/users/profile/skills', {
        token,
        tenantSlug,
        body: { skill_name: skill.name, level: skill.level ?? 5 },
      });
    } catch (e) {
      warn(`Skill ${skill.name} for ${person.email}: ${e.message}`);
    }
  }

  for (const edu of person.education || []) {
    try {
      await request('POST', '/users/profile/education', {
        token,
        tenantSlug,
        body: {
          institution_name: edu.institution_name,
          degree: edu.degree,
          field_of_study: edu.field_of_study,
          cgpa: edu.cgpa,
          start_month: edu.start_month ?? 7,
          start_year: edu.start_year,
          end_month: edu.end_month ?? 5,
          end_year: edu.end_year,
          is_current_studying: edu.end_year >= new Date().getFullYear(),
        },
      });
    } catch (e) {
      warn(`Education for ${person.email}: ${e.message}`);
    }
  }

  for (const exp of person.experience || []) {
    try {
      await request('POST', '/users/profile/experience', {
        token,
        tenantSlug,
        body: {
          title: exp.title,
          company: exp.company,
          description: exp.description,
          start_month: exp.start_month ?? 6,
          start_year: exp.start_year,
          end_month: exp.is_current_role ? undefined : (exp.end_month ?? 5),
          end_year: exp.is_current_role ? undefined : exp.end_year,
          is_current_role: !!exp.is_current_role,
        },
      });
    } catch (e) {
      warn(`Experience for ${person.email}: ${e.message}`);
    }
  }

  for (const pub of person.publications || []) {
    try {
      await request('POST', '/users/profile/publications', {
        token,
        tenantSlug,
        body: {
          title: pub.title,
          venue: pub.journal || pub.venue,
          year: pub.year,
        },
      });
    } catch (e) {
      warn(`Publication for ${person.email}: ${e.message}`);
    }
  }

  for (const proj of person.projects || []) {
    try {
      await request('POST', '/users/projects', {
        token,
        tenantSlug,
        body: {
          title: proj.title,
          description: proj.description,
          technologies: proj.technologies || [],
        },
      });
    } catch (e) {
      warn(`Project for ${person.email}: ${e.message}`);
    }
  }

  stats.profiles += 1;
}

async function seedSocialContent(users, tenantSlug) {
  const byEmail = Object.fromEntries(users.map((u) => [u.email, u]));
  const yash = byEmail['demo.student01@rcpit.demo'];
  const priya = byEmail['demo.student02@rcpit.demo'];
  const karan = byEmail['demo.student09@rcpit.demo'];
  const amit = byEmail['demo.alumni01@rcpit.demo'];
  const hod = byEmail['demo.teacher01@rcpit.demo'];

  if (!yash?.token) return;

  const posts = [
    {
      author: yash,
      content:
        'Excited to share our final-year project demo at RCPIT Tech Fest! Built a campus networking module with real-time feeds. #React #NodeJS #FinalYear #RCPIT',
      type: 'text',
      hashtags: ['React', 'NodeJS', 'FinalYear', 'RCPIT'],
    },
    {
      author: karan,
      content:
        'Training a lightweight NLP model for campus FAQ chatbot. Here is a sample inference snippet:\n\n---CODE---\nfrom transformers import pipeline\nqa = pipeline("question-answering")\nprint(qa(question="When is tech fest?", context="Tech fest is on March 15."))\n---END---',
      type: 'code',
      code_language: 'python',
      code_file_name: 'campus_qa.py',
      hashtags: ['MachineLearning', 'Python', 'AI'],
    },
    {
      author: priya,
      content:
        'Completed my first CTF challenge this weekend! Learned a lot about web security and SQL injection prevention. Grateful to Prof. Desai for the lab sessions. #CyberSecurity #CTF #IT',
      type: 'text',
      hashtags: ['CyberSecurity', 'CTF', 'IT'],
    },
    {
      author: amit,
      content:
        'Back on campus for alumni meet 2025! Great to see the new Vidyalaya Hub platform — proud of what current students are building. #Alumni #RCPIT #Networking',
      type: 'text',
      hashtags: ['Alumni', 'RCPIT', 'Networking'],
    },
    {
      author: hod,
      content:
        'Reminder: Final-year project synopsis submissions are due next Friday. Please coordinate with your guides and upload drafts on the portal. #Academics #Projects #ComputerEngineering',
      type: 'text',
      hashtags: ['Academics', 'Projects', 'ComputerEngineering'],
    },
  ];

  const createdPosts = [];
  for (const p of posts) {
    if (!p.author?.token) continue;
    try {
      const form = new FormData();
      form.append('content', p.content);
      form.append('type', p.type);
      form.append('visibility', 'public');
      form.append('hashtags', JSON.stringify(p.hashtags || []));
      if (p.code_language) form.append('code_language', p.code_language);
      if (p.code_file_name) form.append('code_file_name', p.code_file_name);

      const { json } = await request('POST', '/posts', {
        token: p.author.token,
        tenantSlug,
        formData: form,
        expectStatus: 201,
      });
      const post = json?.data?.post || json?.data || json?.post;
      if (post?.id) {
        createdPosts.push({ post, author: p.author });
        stats.posts += 1;
      }
    } catch (e) {
      stats.errors.push(`Post by ${p.author.email}: ${e.message}`);
    }
  }

  const commentTexts = [
    'This looks amazing! Would love to see a live demo.',
    'Great work — the architecture diagram would be helpful too.',
    'Count me in for the tech fest showcase!',
    'Super useful, thanks for sharing.',
    'We should collaborate on the ML module for this.',
  ];

  for (let i = 0; i < createdPosts.length; i += 1) {
    const { post } = createdPosts[i];
    const commenters = users.filter((u) => u.token && u.id !== createdPosts[i].author.id).slice(0, 3);
    for (let j = 0; j < commenters.length; j += 1) {
      try {
        const { json } = await request('POST', `/posts/${post.id}/comments`, {
          token: commenters[j].token,
          tenantSlug,
          body: { text: commentTexts[(i + j) % commentTexts.length] },
          expectStatus: 201,
        });
        stats.comments += 1;
        const parentId = json?.data?.comment?.id || json?.data?.id;
        if (parentId && commenters[j + 1]) {
          await request('POST', `/posts/${post.id}/comments`, {
            token: createdPosts[i].author.token,
            tenantSlug,
            body: { text: 'Thanks! Happy to share more details.', parent_comment_id: parentId },
          });
          stats.comments += 1;
        }
      } catch (e) {
        stats.errors.push(`Comment on post ${post.id}: ${e.message}`);
      }
    }

    for (const liker of users.filter((u) => u.token).slice(0, 8)) {
      try {
        await request('POST', `/posts/${post.id}/like`, { token: liker.token, tenantSlug });
      } catch {
        /* ignore duplicate likes */
      }
    }
  }
}

async function seedConnections(users, tenantSlug) {
  const withTokens = users.filter((u) => u.token);
  for (let i = 0; i < withTokens.length; i += 1) {
    const sender = withTokens[i];
    for (let j = 1; j <= 3; j += 1) {
      const receiver = withTokens[(i + j) % withTokens.length];
      if (sender.id === receiver.id) continue;
      try {
        const { json, status } = await request('POST', '/connections/request', {
          token: sender.token,
          tenantSlug,
          body: { receiver_id: receiver.id, message: 'Hi! Would love to connect on Vidyalaya Hub.' },
        });
        if (status === 201 || status === 200) {
          const connId = json?.data?.connection?.id || json?.data?.id || json?.connection_id;
          if (connId && j % 2 === 0) {
            await request('PUT', `/connections/${connId}/accept`, {
              token: receiver.token,
              tenantSlug,
            });
            stats.connections += 1;
          }
        }
      } catch (e) {
        if (!/already|exists|pending/i.test(e.message)) {
          stats.errors.push(`Connection ${sender.email} → ${receiver.email}: ${e.message}`);
        }
      }
    }

    try {
      await request('POST', `/connections/follow/${withTokens[(i + 5) % withTokens.length].id}`, {
        token: sender.token,
        tenantSlug,
      });
    } catch {
      /* ignore */
    }
  }
}

async function seedCommunities(users, tenantSlug) {
  const creator = users.find((u) => u.email === 'demo.student01@rcpit.demo' && u.token);
  if (!creator) return;

  const communities = [
    {
      name: 'RCPIT Code Club',
      description: 'Student developers sharing projects, hackathons, and placement prep resources.',
      category: 'Technology',
      tags: ['programming', 'hackathon', 'projects'],
    },
    {
      name: 'Mechanical Innovators',
      description: 'Robotics, CAD, and Formula Student discussions for mechanical engineering students.',
      category: 'Engineering',
      tags: ['robotics', 'cad', 'fsae'],
    },
  ];

  for (const c of communities) {
    try {
      const { json } = await request('POST', '/communities', {
        token: creator.token,
        tenantSlug,
        body: { ...c, is_private: false, rules: ['Be respectful', 'No spam', 'Credit original work'] },
        expectStatus: 201,
      });
      const community = json?.data?.community || json?.data;
      if (!community?.id) continue;
      stats.communities += 1;

      for (const member of users.filter((u) => u.token).slice(0, 12)) {
        try {
          await request('POST', `/communities/${community.id}/join`, { token: member.token, tenantSlug });
        } catch {
          /* already member */
        }
      }

      await request('POST', `/communities/${community.id}/posts`, {
        token: creator.token,
        tenantSlug,
        body: {
          title: `Welcome to ${c.name}`,
          content: `Welcome everyone! Use this space to share updates, ask questions, and collaborate.`,
          tags: c.tags,
        },
        expectStatus: 201,
      });
    } catch (e) {
      if (!/already exists|duplicate/i.test(e.message)) {
        stats.errors.push(`Community ${c.name}: ${e.message}`);
      }
    }
  }
}

async function seedEvents(users, tenantId, tenantSlug) {
  const organizer = users.find((u) => u.email === 'demo.teacher01@rcpit.demo' && u.token);
  if (!organizer) return;

  const events = [
    {
      title: 'RCPIT Tech Fest 2026',
      description: 'Annual technical festival featuring project expo, coding contests, and guest lectures.',
      date: '2026-03-15',
      start_time: '09:00',
      end_time: '18:00',
      location: 'Main Auditorium, R.C. Patel Institute of Technology',
      event_type: 'festival',
      category: 'Technical',
      is_featured: true,
      tags: ['techfest', 'projects', 'coding'],
    },
    {
      title: 'Industry Expert Talk: Cloud Careers',
      description: 'Alumni panel on cloud engineering careers, certifications, and interview preparation.',
      date: '2026-04-10',
      start_time: '14:00',
      end_time: '16:00',
      location: 'Seminar Hall B',
      event_type: 'seminar',
      category: 'Career',
      is_online: false,
      tags: ['cloud', 'career', 'alumni'],
    },
    {
      title: 'Placement Preparation Workshop',
      description: 'Resume reviews, mock interviews, and aptitude practice for final-year students.',
      date: '2026-02-28',
      start_time: '10:00',
      end_time: '13:00',
      location: 'Training Room 3',
      event_type: 'workshop',
      category: 'Placement',
      tags: ['placement', 'interview', 'resume'],
    },
  ];

  for (const ev of events) {
    try {
      const { json } = await request('POST', '/events', {
        token: organizer.token,
        tenantSlug,
        body: { ...ev, visibility: 'college_only' },
        expectStatus: 201,
      });
      const event = json?.data?.event || json?.data;
      if (event?.id) {
        stats.events += 1;
        for (const attendee of users.filter((u) => u.token).slice(0, 10)) {
          try {
            await request('POST', `/events/${event.id}/register`, {
              token: attendee.token,
              tenantSlug,
              body: { status: 'going' },
            });
          } catch {
            /* ignore */
          }
        }
      }
    } catch (e) {
      if (!/already exists|duplicate/i.test(e.message)) {
        stats.errors.push(`Event ${ev.title}: ${e.message}`);
      }
    }
  }
}

async function seedNotices(tenantId, adminUserId) {
  const notices = [
    {
      title: 'Mid-Semester Examination Schedule Released',
      body: 'The mid-semester examination timetable for all branches is now available on the student portal. Please verify your hall ticket details.',
      is_pinned: true,
    },
    {
      title: 'Library Extended Hours During Exam Week',
      body: 'Central library will remain open until 9 PM from Feb 24 to March 7 for exam preparation.',
      is_pinned: false,
    },
    {
      title: 'Campus Wi-Fi Maintenance — March 1',
      body: 'Network maintenance is scheduled on March 1 from 2 AM to 5 AM. Expect brief connectivity interruptions.',
      is_pinned: false,
    },
  ];

  for (const n of notices) {
    const existing = await db.TenantNotice.findOne({
      where: { tenant_id: tenantId, title: n.title },
    });
    if (existing) continue;

    await db.TenantNotice.create({
      tenant_id: tenantId,
      created_by_user_id: adminUserId,
      title: n.title,
      body: n.body,
      starts_at: new Date(),
      ends_at: null,
      is_pinned: n.is_pinned,
      is_archived: false,
    });
    stats.notices += 1;
  }
}

async function verifySample(token, tenantSlug) {
  const checks = [
    ['GET', '/feed/home?limit=5'],
    ['GET', '/posts?limit=5'],
    ['GET', '/connections/suggestions?limit=5'],
    ['GET', '/feed/trending-topics'],
    ['GET', '/feed/sidebar/notices'],
    ['GET', '/events?limit=5'],
    ['GET', '/communities?limit=5'],
  ];

  log('Running verification checks…');
  for (const [method, path] of checks) {
    try {
      const { status } = await request(method, path, { token, tenantSlug });
      log(`  ✓ ${method} ${path} → ${status}`);
    } catch (e) {
      warn(`  ✗ ${method} ${path}: ${e.message}`);
    }
  }
}

async function main() {
  log('Starting Vidyalaya Hub demo seed…');

  const health = await fetch(`${process.env.SEED_BASE_URL || `http://127.0.0.1:${process.env.NODE_PORT || 3030}`}/api/health`);
  if (!health.ok) {
    throw new Error('Backend is not reachable. Start the API server first (npm start).');
  }

  const tenant = await resolveTenant();
  const tenantSlug = tenant.slug || process.env.DEFAULT_TENANT_SLUG || 'rcpit';
  log(`Using college: ${tenant.name} (${tenantSlug})`);

  const allPeople = [
    ...students.map((p) => ({ ...p, userType: 'student' })),
    ...alumni.map((p) => ({ ...p, userType: 'alumni' })),
    ...teachers.map((p) => ({ ...p, userType: 'teacher' })),
  ];

  const registeredUsers = [];
  for (const person of allPeople) {
    try {
      const row = await registerAndApprove(person.userType, person, tenant.tenant_id, tenantSlug);
      registeredUsers.push({ ...person, ...row });
    } catch (e) {
      stats.errors.push(`Register ${person.email}: ${e.message}`);
      warn(e.message);
    }
  }

  log(`Enriching ${registeredUsers.length} profiles via user APIs…`);
  for (const person of registeredUsers) {
    try {
      const { token, user } = await signIn(person.email, DEMO_PASSWORD, tenantSlug);
      person.token = token;
      person.id = user?.id || person.id;
      await enrichProfile(token, tenantSlug, person, person.userType);
    } catch (e) {
      stats.errors.push(`Profile ${person.email}: ${e.message}`);
      warn(`Profile enrichment failed for ${person.email}: ${e.message}`);
    }
  }

  if (!SKIP_SOCIAL) {
    log('Creating social feed, connections, communities, events…');
    await seedSocialContent(registeredUsers, tenantSlug);
    await seedConnections(registeredUsers, tenantSlug);
    await seedCommunities(registeredUsers, tenantSlug);
    await seedEvents(registeredUsers, tenant.tenant_id, tenantSlug);

    const noticeAdmin = registeredUsers.find((u) => u.email === 'demo.teacher01@rcpit.demo');
    if (noticeAdmin?.id) {
      await seedNotices(tenant.tenant_id, noticeAdmin.id);
    }
  }

  const sampleUser = registeredUsers.find((u) => u.token);
  if (sampleUser?.token) await verifySample(sampleUser.token, tenantSlug);

  console.log('\n══════════════════════════════════════════');
  console.log('  Vidyalaya Hub Demo Seed — Summary');
  console.log('══════════════════════════════════════════');
  console.log(`  College:      ${tenant.name}`);
  console.log(`  Tenant slug:  ${tenantSlug}`);
  console.log(`  Password:     ${DEMO_PASSWORD}`);
  console.log(`  Registered:   ${stats.registered}`);
  console.log(`  Skipped:      ${stats.skipped} (already existed)`);
  console.log(`  Approved:     ${stats.approved}`);
  console.log(`  Profiles:     ${stats.profiles}`);
  console.log(`  Posts:        ${stats.posts}`);
  console.log(`  Comments:     ${stats.comments}`);
  console.log(`  Connections:  ${stats.connections}`);
  console.log(`  Communities:  ${stats.communities}`);
  console.log(`  Events:       ${stats.events}`);
  console.log(`  Notices:      ${stats.notices}`);
  console.log(`  Errors:       ${stats.errors.length}`);
  if (stats.errors.length) {
    console.log('\n  Error details:');
    stats.errors.slice(0, 15).forEach((e) => console.log(`    - ${e}`));
    if (stats.errors.length > 15) console.log(`    … and ${stats.errors.length - 15} more`);
  }
  console.log('\n  Sample logins:');
  console.log('    demo.student01@rcpit.demo  (Yash Chaudhari — CE Final Year)');
  console.log('    demo.alumni01@rcpit.demo   (Amit Verma — TCS Alumni)');
  console.log('    demo.teacher01@rcpit.demo  (Dr. Rajesh Verma — HOD CE)');
  console.log('══════════════════════════════════════════\n');

  await db.sequelize.close();
  process.exit(stats.errors.length > 5 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('[seed:fatal]', err);
  try {
    await db.sequelize.close();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
