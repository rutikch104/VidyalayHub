const { Op } = require('sequelize');
const db = require('../database/index');

const SEP = ' • ';

function joinParts(parts) {
  return parts
    .map((p) => (p == null ? '' : String(p).trim()))
    .filter(Boolean)
    .join(SEP) || null;
}

function extractGraduationYear(ad) {
  if (!ad) return null;
  if (ad.graduation_year) return Number(ad.graduation_year);
  if (ad.year_of_graduation) {
    const y = new Date(ad.year_of_graduation).getFullYear();
    return Number.isFinite(y) ? y : null;
  }
  if (ad.academic_batch) {
    const m = String(ad.academic_batch).match(/(\d{4})\s*[-–]\s*(\d{4})/);
    if (m) return Number(m[2]);
    const single = String(ad.academic_batch).match(/(\d{4})/);
    if (single) return Number(single[1]);
  }
  return null;
}

function formatAlumniBatch(ad) {
  const gradYear = extractGraduationYear(ad);
  if (gradYear) return `Batch ${gradYear}`;
  return null;
}

function buildProfessionalIdentity(userType, td, ad, tenantName) {
  const type = String(userType || '').toLowerCase();

  if (type === 'alumni') {
    const position = (ad?.current_job_title || ad?.position || '').trim();
    const company = (ad?.company_name || ad?.company || '').trim();
    if (position && company) return `${position} at ${company}`;
    if (position) return position;
    if (company) return company;
    return null;
  }

  if (type === 'teacher') {
    const institution = (tenantName || '').trim();
    return institution || null;
  }

  return null;
}

function buildAcademicIdentity(userType, sd, td, ad) {
  const type = String(userType || '').toLowerCase();

  if (type === 'student' && sd) {
    return joinParts([sd.degree, sd.stream, sd.year]);
  }

  if (type === 'teacher' && td) {
    return joinParts([td.designation, td.department]);
  }

  if (type === 'alumni' && ad) {
    return joinParts([ad.degree, ad.stream, formatAlumniBatch(ad)]);
  }

  return null;
}

function buildAcademicIdentityFields(userType, sd, td, ad, tenantName) {
  const type = String(userType || '').toLowerCase();
  const base = {
    academic_identity: buildAcademicIdentity(userType, sd, td, ad),
    professional_identity: buildProfessionalIdentity(type, td, ad, tenantName),
    degree: null,
    branch: null,
    academic_year: null,
    graduation_batch: null,
    designation: null,
    department: null,
    company: null,
    position: null,
  };

  if (type === 'student' && sd) {
    base.degree = sd.degree || null;
    base.branch = sd.stream || null;
    base.academic_year = sd.year || null;
  } else if (type === 'teacher' && td) {
    base.designation = td.designation || null;
    base.department = td.department || null;
  } else if (type === 'alumni' && ad) {
    base.degree = ad.degree || null;
    base.branch = ad.stream || null;
    base.graduation_batch = formatAlumniBatch(ad);
    base.company = ad.company_name || null;
    base.position = ad.current_job_title || null;
  }

  return base;
}

function buildAcademicIdentityFromRecord(userRecord) {
  const u = userRecord?.get ? userRecord.get({ plain: true }) : userRecord || {};
  return buildAcademicIdentity(
    u.user_type,
    u.studentDetails,
    u.teacherDetails,
    u.alumniDetails,
  );
}

async function loadAcademicIdentityForUsers(users) {
  const map = new Map();
  const list = (users || []).map((u) => (u?.get ? u.get({ plain: true }) : u)).filter(Boolean);
  if (!list.length) return map;

  const userTenantMap = new Map();
  for (const u of list) {
    if (u.id) userTenantMap.set(String(u.id), u.tenant_id || null);
  }

  const byType = { student: [], teacher: [], alumni: [] };
  for (const u of list) {
    const type = String(u.user_type || '').toLowerCase();
    if (byType[type]) byType[type].push(String(u.id));
  }

  const tenantIds = [
    ...new Set(
      list
        .filter((u) => String(u.user_type || '').toLowerCase() === 'teacher')
        .map((u) => u.tenant_id)
        .filter(Boolean)
        .map(String),
    ),
  ];
  const tenantNameById = new Map();
  if (tenantIds.length) {
    const tenants = await db.Tenant.findAll({
      where: { tenant_id: { [Op.in]: tenantIds } },
      attributes: ['tenant_id', 'name', 'short_name'],
    });
    for (const t of tenants) {
      const j = t.get ? t.get({ plain: true }) : t;
      tenantNameById.set(String(j.tenant_id), j.short_name || j.name || null);
    }
  }

  const tasks = [];

  if (byType.student.length) {
    tasks.push(
      db.StudentDetail.findAll({
        where: { user_id: { [Op.in]: byType.student } },
        attributes: ['user_id', 'degree', 'stream', 'year'],
      }).then((rows) => {
        for (const r of rows) {
          const fields = buildAcademicIdentityFields('student', r, null, null, null);
          map.set(String(r.user_id), fields);
        }
      }),
    );
  }

  if (byType.teacher.length) {
    tasks.push(
      db.TeacherDetail.findAll({
        where: { user_id: { [Op.in]: byType.teacher } },
        attributes: ['user_id', 'department', 'designation'],
      }).then((rows) => {
        for (const r of rows) {
          const tenantId = userTenantMap.get(String(r.user_id));
          const tenantName = tenantId ? tenantNameById.get(String(tenantId)) : null;
          const fields = buildAcademicIdentityFields('teacher', null, r, null, tenantName);
          map.set(String(r.user_id), fields);
        }
      }),
    );
  }

  if (byType.alumni.length) {
    tasks.push(
      db.AlumniDetail.findAll({
        where: { user_id: { [Op.in]: byType.alumni } },
        attributes: [
          'user_id',
          'degree',
          'stream',
          'academic_batch',
          'graduation_year',
          'year_of_graduation',
          'current_job_title',
          'company_name',
        ],
      }).then((rows) => {
        for (const r of rows) {
          const fields = buildAcademicIdentityFields('alumni', null, null, r, null);
          map.set(String(r.user_id), fields);
        }
      }),
    );
  }

  await Promise.all(tasks);
  return map;
}

function applyAcademicIdentityToUser(user, identityMap) {
  if (!user?.id || !identityMap) return user;
  const fields = identityMap.get(String(user.id));
  if (!fields) return user;
  return {
    ...user,
    ...fields,
    headline: fields.academic_identity || user.headline || null,
    professional_identity: fields.professional_identity || user.professional_identity || null,
  };
}

function collectUsersFromPosts(posts) {
  const users = [];
  const seen = new Set();

  function walkComments(comments) {
    for (const c of comments || []) {
      if (c?.user?.id && !seen.has(String(c.user.id))) {
        seen.add(String(c.user.id));
        users.push(c.user);
      }
      walkComments(c.replies);
    }
  }

  for (const p of posts || []) {
    if (p?.user?.id && !seen.has(String(p.user.id))) {
      seen.add(String(p.user.id));
      users.push(p.user);
    }
    walkComments(p.comments);
  }

  return users;
}

async function enrichPostsWithAcademicIdentity(posts) {
  if (!Array.isArray(posts) || !posts.length) return posts;

  const users = collectUsersFromPosts(posts);
  const identityMap = await loadAcademicIdentityForUsers(users);

  function enrichComments(comments) {
    for (const c of comments || []) {
      if (c.user) c.user = applyAcademicIdentityToUser(c.user, identityMap);
      enrichComments(c.replies);
    }
  }

  for (const p of posts) {
    if (p.user) p.user = applyAcademicIdentityToUser(p.user, identityMap);
    enrichComments(p.comments);
  }

  return posts;
}

async function enrichCommentsWithAcademicIdentity(comments) {
  if (!Array.isArray(comments) || !comments.length) return comments;

  const users = [];
  const seen = new Set();

  function collect(nodes) {
    for (const c of nodes || []) {
      if (c?.user?.id && !seen.has(String(c.user.id))) {
        seen.add(String(c.user.id));
        users.push(c.user);
      }
      collect(c.replies);
    }
  }

  collect(comments);
  const identityMap = await loadAcademicIdentityForUsers(users);

  function apply(nodes) {
    for (const c of nodes || []) {
      if (c.user) c.user = applyAcademicIdentityToUser(c.user, identityMap);
      apply(c.replies);
    }
  }

  apply(comments);
  return comments;
}

module.exports = {
  SEP,
  joinParts,
  buildAcademicIdentity,
  buildProfessionalIdentity,
  buildAcademicIdentityFields,
  buildAcademicIdentityFromRecord,
  loadAcademicIdentityForUsers,
  applyAcademicIdentityToUser,
  enrichPostsWithAcademicIdentity,
  enrichCommentsWithAcademicIdentity,
};
