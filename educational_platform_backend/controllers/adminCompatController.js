const bcrypt = require('bcrypt');
const db = require('../database/index');
const { Op } = require('sequelize');
const { ilikeContainsPattern } = require('../utils/searchQuery');
const { resolveMediaUrl } = require('../utils/resolveMediaUrl');
const { registrationStatusLabel } = require('../services/campusRegistrationService');

const TENANT_TYPES = new Set(['University', 'Engineering', 'Arts College']);

function normalizeTenantType(raw) {
  const t = raw ? String(raw).trim() : '';
  if (TENANT_TYPES.has(t)) return t;
  if (/engineer/i.test(t)) return 'Engineering';
  if (/art/i.test(t)) return 'Arts College';
  return 'University';
}

function normalizeWebsite(domain) {
  if (domain == null || String(domain).trim() === '') return null;
  let s = String(domain).trim();
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    // eslint-disable-next-line no-new
    new URL(s);
  } catch {
    return null;
  }
  return s;
}

/** Staff users are scoped to one tenant; allow create when same rules as super-admin bypass. */
function canBypassTenantScopeForCreate(req) {
  if (!req.adminTenantFilter) return true;
  const email = String(req.user?.email || '').toLowerCase().trim();
  const raw = [
    ...String(process.env.SUPER_ADMIN_EMAILS || '').split(','),
    ...String(process.env.PLATFORM_ADMIN_EMAILS || '').split(','),
  ];
  const allow = [...new Set(raw.map((x) => String(x).trim().toLowerCase()).filter(Boolean))];
  if (allow.includes(email)) return true;
  if (req.user?.is_admin) return true;
  if (String(process.env.SUPER_ADMIN_OPEN || '').toLowerCase() === 'true') return true;
  return false;
}

function mapDbStatusToUi(status) {
  if (status === 'approved') return 'Active';
  if (status === 'pending') return 'Probation';
  return 'Inactive';
}

function uiCollegeStatusToDb(status) {
  if (status === 'Active') return 'approved';
  if (status === 'Probation' || status === 'Pending') return 'pending';
  if (status === 'Inactive') return 'rejected';
  return undefined;
}

function tenantWhereClause(req) {
  if (req.adminTenantFilter) {
    return { tenant_id: req.adminTenantFilter };
  }
  return {};
}

async function primaryTenantAdmin(tenantId) {
  const row = await db.TenantAdmin.findOne({
    where: { tenant_id: tenantId },
    order: [['email', 'ASC']],
  });
  if (!row) return { name: '', email: '', phone: '' };
  const j = row.toJSON ? row.toJSON() : row;
  return {
    name: j.full_name || '',
    email: j.email || '',
    phone: j.phone || '',
  };
}

async function mapTenant(t, includeCounts = true) {
  const j = t.toJSON ? t.toJSON() : t;
  const tid = j.tenant_id;
  const admin = await primaryTenantAdmin(tid);
  const m = {
    id: String(tid),
    name: j.name,
    type: j.type || 'University',
    location: j.affiliation || j.about || '',
    domain: j.website || '',
    admin: { name: admin.name, email: admin.email },
    users: { students: 0, teachers: 0 },
    status: mapDbStatusToUi(j.status),
    joined: j.created_at,
    created_at: j.created_at,
    updated_at: j.updated_at,
  };
  if (includeCounts) {
    const [students, teachers] = await Promise.all([
      db.User.count({ where: { tenant_id: tid, user_type: 'student' } }),
      db.User.count({ where: { tenant_id: tid, user_type: 'teacher' } }),
    ]);
    m.users = { students, teachers };
  }
  return m;
}

exports.getAdminStats = async (req, res) => {
  try {
    const tw = tenantWhereClause(req);
    const collegeWhere = req.adminTenantFilter ? { tenant_id: req.adminTenantFilter } : {};

    const total_colleges = await db.Tenant.count({ where: collegeWhere });
    const total_students = await db.User.count({
      where: { user_type: 'student', ...tw },
    });
    const total_teachers = await db.User.count({
      where: { user_type: 'teacher', ...tw },
    });
    const total_staff = await db.User.count({
      where: { user_type: 'staff', ...tw },
    });
    const pending_student_registrations = await db.User.count({
      where: { user_type: 'student', is_approved: false, ...tw },
    });
    const pending_teacher_registrations = await db.User.count({
      where: { user_type: 'teacher', is_approved: false, ...tw },
    });
    const pending_alumni_registrations = await db.User.count({
      where: { user_type: 'alumni', is_approved: false, ...tw },
    });

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const newStudents = await db.User.count({
      where: {
        user_type: 'student',
        ...tw,
        created_at: { [Op.gte]: monthAgo },
      },
    });
    const newTeachers = await db.User.count({
      where: {
        user_type: 'teacher',
        ...tw,
        created_at: { [Op.gte]: monthAgo },
      },
    });
    const newColleges = req.adminTenantFilter
      ? 0
      : await db.Tenant.count({ where: { created_at: { [Op.gte]: monthAgo } } });

    return res.status(200).json({
      status: true,
      data: {
        total_colleges,
        total_students,
        total_teachers,
        total_staff,
        pending_student_registrations,
        pending_teacher_registrations,
        pending_alumni_registrations,
        pending_registrations:
          pending_student_registrations + pending_teacher_registrations + pending_alumni_registrations,
        active_sessions: 0,
        growth_metrics: {
          colleges_growth: newColleges,
          students_growth: newStudents,
          teachers_growth: newTeachers,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.getColleges = async (req, res) => {
  try {
    const page = parseInt(String(req.query.page), 10) || 1;
    const limit = Math.min(100, parseInt(String(req.query.limit), 10) || 20);
    const offset = (page - 1) * limit;
    const { search, status } = req.query;

    const where = { ...tenantWhereClause(req) };

    if (search && String(search).trim()) {
      const pat = ilikeContainsPattern(search);
      if (pat) {
        where[Op.and] = where[Op.and] || [];
        where[Op.and].push({
          [Op.or]: [
            { name: { [Op.iLike]: pat } },
            { affiliation: { [Op.iLike]: pat } },
            { about: { [Op.iLike]: pat } },
          ],
        });
      }
    }

    if (status && String(status) !== 'All') {
      const dbS = uiCollegeStatusToDb(String(status));
      if (dbS) where.status = dbS;
    }

    const { count, rows } = await db.Tenant.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      offset,
      limit,
    });

    const colleges = [];
    for (const t of rows) {
      colleges.push(await mapTenant(t, true));
    }

    return res.status(200).json({
      status: true,
      data: {
        colleges,
        pagination: { total: count, page, pages: Math.ceil(count / limit) || 1 },
      },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.getCollege = async (req, res) => {
  try {
    const where = { tenant_id: req.params.collegeId };
    if (req.adminTenantFilter && req.adminTenantFilter !== req.params.collegeId) {
      return res.status(403).json({ status: false, message: 'Access denied.' });
    }
    const t = await db.Tenant.findOne({ where });
    if (!t) {
      return res.status(404).json({ status: false, message: 'College not found' });
    }
    return res.status(200).json({ status: true, data: await mapTenant(t, true) });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.createCollege = async (req, res) => {
  try {
    const { name, type, location, domain, admin_email, admin_name } = req.body;
    if (req.adminTenantFilter && !canBypassTenantScopeForCreate(req)) {
      return res.status(403).json({
        status: false,
        message:
          'Cannot create colleges from a scoped college-staff account. Log in as a non-staff user, add your email to SUPER_ADMIN_EMAILS / PLATFORM_ADMIN_EMAILS, or set SUPER_ADMIN_OPEN=true for local dev.',
      });
    }
    const website = normalizeWebsite(domain);
    const row = await db.Tenant.create({
      name: name || 'New institution',
      type: normalizeTenantType(type),
      affiliation: location || null,
      website,
      status: 'pending',
    });
    const m = await mapTenant(row, true);
    m.admin = { name: admin_name || '', email: admin_email || '' };
    return res.status(201).json({ status: true, data: m });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.updateCollege = async (req, res) => {
  try {
    if (req.adminTenantFilter && req.adminTenantFilter !== req.params.collegeId) {
      return res.status(403).json({ status: false, message: 'Access denied.' });
    }
    const t = await db.Tenant.findByPk(req.params.collegeId);
    if (!t) {
      return res.status(404).json({ status: false, message: 'College not found' });
    }
    const { name, type, location, domain, status } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = normalizeTenantType(type);
    if (location !== undefined) updates.affiliation = location;
    if (domain !== undefined) updates.website = normalizeWebsite(domain);
    const dbStatus = status !== undefined ? uiCollegeStatusToDb(String(status)) : undefined;
    if (dbStatus) updates.status = dbStatus;
    if (Object.keys(updates).length) await t.update(updates);
    await t.reload();
    return res.status(200).json({ status: true, data: await mapTenant(t, true) });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.deleteCollege = async (req, res) => {
  try {
    if (req.adminTenantFilter && req.adminTenantFilter !== req.params.collegeId) {
      return res.status(403).json({ status: false, message: 'Access denied.' });
    }
    const t = await db.Tenant.findByPk(req.params.collegeId);
    if (!t) {
      return res.status(404).json({ status: false, message: 'College not found' });
    }
    await t.destroy();
    return res.status(200).json({ status: true, message: 'Deleted' });
  } catch (err) {
    const msg = err.name === 'SequelizeForeignKeyConstraintError' ? err.message : err.message;
    const code = err.name === 'SequelizeForeignKeyConstraintError' ? 409 : 500;
    return res.status(code).json({
      status: false,
      message:
        code === 409
          ? 'Cannot delete this college while users or related records still reference it.'
          : msg,
    });
  }
};

function mapUser(u) {
  const j = u.toJSON ? u.toJSON() : u;
  const name = [j.first_name, j.last_name].filter(Boolean).join(' ') || j.email;
  const sd = j.studentDetails || null;
  const td = j.teacherDetails || null;
  const ad = j.alumniDetails || null;
  const regStatus = j.registration_status || (j.is_approved ? 'approved' : 'pending_approval');

  return {
    id: String(j.id),
    name,
    email: j.email,
    phone_number: j.phone_number || '',
    college_email: j.college_email || j.app_settings?.college_email || '',
    rollNumber: sd?.roll_number || ad?.roll_number || '',
    className: sd?.division || '',
    studentId: sd?.student_id || ad?.student_id || '',
    alumniId: ad?.alumni_id || '',
    collegeId: sd?.college_id || ad?.college_id || '',
    universityRegNumber: sd?.university_reg_number || ad?.university_reg_number || '',
    academicBatch: sd?.academic_batch || ad?.academic_batch || '',
    department: sd?.degree || td?.department || ad?.degree || '',
    branch: sd?.stream || ad?.stream || '',
    year: sd?.year || '',
    semester: sd?.semester ? (String(sd.semester).match(/^\d+$/) ? `Semester ${sd.semester}` : sd.semester) : '',
    admissionYear: sd?.admission_year || ad?.admission_year || '',
    graduationYear: sd?.expected_graduation_year || ad?.graduation_year || '',
    designation: td?.designation || ad?.current_job_title || '',
    company: ad?.company_name || '',
    gpa: sd?.cgpa || ad?.final_cgpa || 0,
    status: j.is_approved ? 'Active' : 'Pending',
    registration_status: regStatus,
    registration_status_label: registrationStatusLabel(regStatus),
    joinDate: j.created_at,
    submitted_at: j.registration_submitted_at || j.created_at,
    avatar: j.profile_picture ? resolveMediaUrl(j.profile_picture) : '',
    user_type: j.user_type,
    tenant_id: j.tenant_id != null ? String(j.tenant_id) : '',
    college_name: j.tenant?.name || '',
    position: td?.designation || ad?.current_job_title || '',
    courses: [],
    joined: j.created_at,
    documents: (j.registrationDocuments || []).map((doc) => ({
      id: String(doc.id),
      doc_type: doc.doc_type,
      url: resolveMediaUrl(doc.storage_url) || doc.storage_url,
      file_name: doc.file_name,
      review_status: doc.review_status,
    })),
  };
}

function applyUserStatusFilter(where, statusQuery) {
  if (!statusQuery || String(statusQuery) === 'All') return where;
  const s = String(statusQuery);
  if (s === 'Active' || s === 'Approved') {
    return { ...where, is_approved: true };
  }
  if (s === 'Pending' || s === 'Pending Approval') {
    return {
      ...where,
      is_approved: false,
      registration_status: { [Op.in]: ['pending_approval', 'under_review', 'needs_info'] },
    };
  }
  if (s === 'Under Review') return { ...where, registration_status: 'under_review' };
  if (s === 'Rejected') return { ...where, registration_status: 'rejected' };
  if (s === 'Suspended') return { ...where, registration_status: 'suspended' };
  if (s === 'Inactive') return { ...where, is_approved: false };
  return where;
}

const registrationUserIncludes = [
  { model: db.StudentDetail, as: 'studentDetails', required: false },
  { model: db.TeacherDetail, as: 'teacherDetails', required: false },
  { model: db.AlumniDetail, as: 'alumniDetails', required: false },
  { model: db.Tenant, as: 'tenant', attributes: ['name'], required: false },
  { model: db.UserRegistrationDocument, as: 'registrationDocuments', required: false },
];

exports.getStudents = async (req, res) => {
  try {
    const page = parseInt(String(req.query.page), 10) || 1;
    const limit = Math.min(100, parseInt(String(req.query.limit), 10) || 20);
    const offset = (page - 1) * limit;
    const where = applyUserStatusFilter(
      { user_type: 'student', ...tenantWhereClause(req) },
      req.query.status
    );
    if (req.query.college_id) {
      if (req.adminTenantFilter && req.adminTenantFilter !== String(req.query.college_id)) {
        return res.status(403).json({ status: false, message: 'Access denied.' });
      }
      where.tenant_id = req.query.college_id;
    }
    if (req.query.search) {
      const pat = ilikeContainsPattern(req.query.search);
      if (pat) {
        where[Op.or] = [
          { first_name: { [Op.iLike]: pat } },
          { last_name: { [Op.iLike]: pat } },
          { email: { [Op.iLike]: pat } },
        ];
      }
    }
    const { count, rows } = await db.User.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash'] },
      include: registrationUserIncludes,
      offset,
      limit,
      order: [['created_at', 'DESC']],
    });
    return res.status(200).json({
      status: true,
      data: {
        students: rows.map(mapUser),
        pagination: { total: count, page, pages: Math.ceil(count / limit) || 1 },
      },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.getTeachers = async (req, res) => {
  try {
    const page = parseInt(String(req.query.page), 10) || 1;
    const limit = Math.min(100, parseInt(String(req.query.limit), 10) || 20);
    const offset = (page - 1) * limit;
    const where = applyUserStatusFilter(
      { user_type: 'teacher', ...tenantWhereClause(req) },
      req.query.status
    );
    if (req.query.college_id) {
      if (req.adminTenantFilter && req.adminTenantFilter !== String(req.query.college_id)) {
        return res.status(403).json({ status: false, message: 'Access denied.' });
      }
      where.tenant_id = req.query.college_id;
    }
    if (req.query.search) {
      const pat = ilikeContainsPattern(req.query.search);
      if (pat) {
        where[Op.or] = [
          { first_name: { [Op.iLike]: pat } },
          { last_name: { [Op.iLike]: pat } },
          { email: { [Op.iLike]: pat } },
        ];
      }
    }
    const { count, rows } = await db.User.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash'] },
      include: registrationUserIncludes,
      offset,
      limit,
      order: [['created_at', 'DESC']],
    });
    return res.status(200).json({
      status: true,
      data: {
        teachers: rows.map(mapUser),
        pagination: { total: count, page, pages: Math.ceil(count / limit) || 1 },
      },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.getAlumni = async (req, res) => {
  try {
    const page = parseInt(String(req.query.page), 10) || 1;
    const limit = Math.min(100, parseInt(String(req.query.limit), 10) || 20);
    const offset = (page - 1) * limit;
    const where = applyUserStatusFilter(
      { user_type: 'alumni', ...tenantWhereClause(req) },
      req.query.status,
    );
    if (req.query.search) {
      const pat = ilikeContainsPattern(req.query.search);
      if (pat) {
        where[Op.or] = [
          { first_name: { [Op.iLike]: pat } },
          { last_name: { [Op.iLike]: pat } },
          { email: { [Op.iLike]: pat } },
        ];
      }
    }
    const { count, rows } = await db.User.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash'] },
      include: registrationUserIncludes,
      offset,
      limit,
      order: [['created_at', 'DESC']],
    });
    return res.status(200).json({
      status: true,
      data: {
        alumni: rows.map(mapUser),
        pagination: { total: count, page, pages: Math.ceil(count / limit) || 1 },
      },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.getRegistrationApplication = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.params.userId, {
      attributes: { exclude: ['password_hash'] },
      include: registrationUserIncludes,
    });
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }
    if (req.adminTenantFilter && String(user.tenant_id) !== req.adminTenantFilter) {
      return res.status(403).json({ status: false, message: 'Access denied.' });
    }
    const mapped = mapUser(user);
    mapped.rejection_reason = user.registration_rejection_reason;
    mapped.admin_notes = user.registration_admin_notes;
    mapped.reviewed_at = user.registration_reviewed_at;
    return res.status(200).json({ status: true, data: mapped });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

/**
 * College admins (scoped staff) or platform admins create student / teacher / staff
 * accounts for a tenant. Created users are approved immediately.
 */
exports.createUser = async (req, res) => {
  try {
    const {
      email,
      password,
      first_name,
      last_name,
      phone_number,
      user_type: userTypeRaw,
      tenant_id: tenantIdBody,
      college_id: collegeIdBody,
    } = req.body;

    if (!email || !password || !userTypeRaw) {
      return res.status(400).json({
        status: false,
        message: 'email, password, and user_type are required.',
      });
    }
    const ut = String(userTypeRaw).toLowerCase();
    if (!['student', 'teacher', 'staff'].includes(ut)) {
      return res.status(400).json({
        status: false,
        message: 'user_type must be student, teacher, or staff.',
      });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ status: false, message: 'Password must be at least 6 characters.' });
    }

    let tenant_id;
    if (req.adminTenantFilter) {
      tenant_id = req.adminTenantFilter;
    } else {
      const tid = tenantIdBody || collegeIdBody;
      if (!tid) {
        return res.status(400).json({
          status: false,
          message: 'tenant_id (or college_id) is required when creating users as a platform administrator.',
        });
      }
      const t = await db.Tenant.findByPk(String(tid));
      if (!t) return res.status(404).json({ status: false, message: 'College not found.' });
      tenant_id = t.tenant_id;
    }

    const em = String(email).toLowerCase().trim();
    const existing = await db.User.findOne({ where: { email: em } });
    if (existing) {
      return res.status(409).json({ status: false, message: 'An account with this email already exists.' });
    }

    const password_hash = await bcrypt.hash(String(password), 10);
    const defaultRole = await db.Role.findOne({ where: { name: 'USER' }, attributes: ['id'] });
    const transaction = await db.sequelize.transaction();
    let user;
    try {
      user = await db.User.create(
        {
          tenant_id,
          user_type: ut,
          first_name: first_name || null,
          last_name: last_name || null,
          email: em,
          role_id: defaultRole?.id || null,
          phone_number: phone_number || null,
          password_hash,
          is_approved: true,
          password_changed_at: new Date(),
        },
        { transaction }
      );
      if (ut === 'student') {
        await db.StudentDetail.create({ user_id: user.id }, { transaction });
      } else if (ut === 'teacher') {
        await db.TeacherDetail.create({ user_id: user.id }, { transaction });
      }
      await transaction.commit();
    } catch (inner) {
      await transaction.rollback();
      throw inner;
    }

    const row = await db.User.findByPk(user.id, { attributes: { exclude: ['password_hash'] } });
    return res.status(201).json({ status: true, data: mapUser(row) });
  } catch (err) {
    console.error('createUser', err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ status: false, message: 'Email is already in use.' });
    }
    return res.status(500).json({ status: false, message: err.message || 'Failed to create user.' });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { status, action, rejection_reason, admin_notes } = req.body;
    const user = await db.User.findByPk(req.params.userId);
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }
    if (req.adminTenantFilter && String(user.tenant_id) !== req.adminTenantFilter) {
      return res.status(403).json({ status: false, message: 'Access denied.' });
    }

    const normalized = String(action || status || '').toLowerCase();
    const updates = {
      registration_reviewed_at: new Date(),
      registration_reviewed_by: req.user.id,
    };

    if (normalized === 'active' || normalized === 'approved' || normalized === 'approve') {
      updates.is_approved = true;
      updates.registration_status = 'approved';
      updates.registration_rejection_reason = null;
      updates.registration_admin_notes = admin_notes || null;
    } else if (normalized === 'reject' || normalized === 'rejected') {
      updates.is_approved = false;
      updates.registration_status = 'rejected';
      updates.registration_rejection_reason = rejection_reason || 'Registration rejected by college administration.';
      updates.registration_admin_notes = admin_notes || null;
    } else if (normalized === 'under_review' || normalized === 'under review') {
      updates.is_approved = false;
      updates.registration_status = 'under_review';
      updates.registration_admin_notes = admin_notes || null;
    } else if (normalized === 'needs_info' || normalized === 'request_info') {
      updates.is_approved = false;
      updates.registration_status = 'needs_info';
      updates.registration_admin_notes = admin_notes || rejection_reason || 'Additional information required.';
    } else if (normalized === 'suspended') {
      updates.is_approved = false;
      updates.registration_status = 'suspended';
      updates.registration_admin_notes = admin_notes || null;
    } else {
      updates.is_approved = status === 'Active' || status === 'active';
      if (updates.is_approved) updates.registration_status = 'approved';
    }

    await user.update(updates);
    await user.reload();
    return res.status(200).json({
      status: true,
      message: 'Registration review updated.',
      data: {
        registration_status: user.registration_status,
        registration_status_label: registrationStatusLabel(user.registration_status),
      },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const tw = tenantWhereClause(req);
    const [students, teachers, tenants] = await Promise.all([
      db.User.count({ where: { user_type: 'student', ...tw } }),
      db.User.count({ where: { user_type: 'teacher', ...tw } }),
      req.adminTenantFilter ? 1 : db.Tenant.count(),
    ]);
    return res.status(200).json({
      status: true,
      data: {
        summary: { students, teachers, colleges: tenants },
        series: [],
      },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

function csvEscape(v) {
  const s = v == null ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

exports.exportData = async (req, res) => {
  const { type } = req.params;
  const tw = tenantWhereClause(req);
  if (!['colleges', 'students', 'teachers'].includes(type)) {
    return res.status(400).json({ status: false, message: 'Unknown export type.' });
  }
  try {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-export.csv"`);

    if (type === 'colleges') {
      const where = req.adminTenantFilter ? { tenant_id: req.adminTenantFilter } : {};
      const rows = await db.Tenant.findAll({ where, order: [['created_at', 'DESC']] });
      const lines = ['id,name,type,status,students,teachers,created_at'];
      for (const t of rows) {
        const m = await mapTenant(t, true);
        lines.push(
          [
            csvEscape(m.id),
            csvEscape(m.name),
            csvEscape(m.type),
            csvEscape(m.status),
            m.users.students,
            m.users.teachers,
            csvEscape(m.created_at),
          ].join(',')
        );
      }
      return res.status(200).send(lines.join('\n'));
    }

    if (type === 'students') {
      const rows = await db.User.findAll({
        where: { user_type: 'student', ...tw },
        attributes: { exclude: ['password_hash'] },
        order: [['created_at', 'DESC']],
        limit: 5000,
      });
      const lines = ['id,name,email,status,tenant_id,created_at'];
      for (const u of rows) {
        const m = mapUser(u);
        lines.push(
          [csvEscape(m.id), csvEscape(m.name), csvEscape(m.email), csvEscape(m.status), csvEscape(m.tenant_id), csvEscape(m.joined)].join(
            ','
          )
        );
      }
      return res.status(200).send(lines.join('\n'));
    }

    if (type === 'teachers') {
      const rows = await db.User.findAll({
        where: { user_type: 'teacher', ...tw },
        attributes: { exclude: ['password_hash'] },
        order: [['created_at', 'DESC']],
        limit: 5000,
      });
      const lines = ['id,name,email,status,tenant_id,created_at'];
      for (const u of rows) {
        const m = mapUser(u);
        lines.push(
          [csvEscape(m.id), csvEscape(m.name), csvEscape(m.email), csvEscape(m.status), csvEscape(m.tenant_id), csvEscape(m.joined)].join(
            ','
          )
        );
      }
      return res.status(200).send(lines.join('\n'));
    }
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

function noticeAuthorDisplay(author) {
  if (!author) return 'Staff';
  const j = typeof author.get === 'function' ? author.get({ plain: true }) : author;
  const n = [j.first_name, j.last_name].filter(Boolean).join(' ').trim();
  return n || 'Staff';
}

function resolveNoticeTenantIdForWrite(req, body) {
  if (req.adminTenantFilter) return String(req.adminTenantFilter);
  const tid = body?.tenant_id || body?.college_id;
  return tid ? String(tid) : null;
}

/** Staff / platform: list all notices for a college (including scheduled & archived) */
exports.listAdminTenantNotices = async (req, res) => {
  try {
    let tenantId = req.adminTenantFilter ? String(req.adminTenantFilter) : null;
    if (!tenantId) {
      const q = req.query.tenant_id || req.query.college_id;
      if (!q) {
        return res.status(400).json({ status: false, message: 'Pass tenant_id to list notices for a college.' });
      }
      tenantId = String(q);
    }
    const rows = await db.TenantNotice.findAll({
      where: { tenant_id: tenantId },
      include: [
        { model: db.User, as: 'author', attributes: ['id', 'first_name', 'last_name', 'email'], required: false },
      ],
      order: [
        ['is_archived', 'ASC'],
        ['is_pinned', 'DESC'],
        ['created_at', 'DESC'],
      ],
    });
    const notices = rows.map((row) => {
      const p = row.get({ plain: true });
      return {
        id: p.id,
        tenant_id: p.tenant_id,
        title: p.title,
        body: (p.body || '').trim(),
        starts_at: p.starts_at,
        ends_at: p.ends_at,
        is_pinned: p.is_pinned,
        is_archived: p.is_archived,
        created_at: p.created_at,
        updated_at: p.updated_at,
        author_name: noticeAuthorDisplay(p.author),
      };
    });
    return res.status(200).json({ status: true, data: { notices } });
  } catch (err) {
    console.error('listAdminTenantNotices', err);
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.createTenantNotice = async (req, res) => {
  try {
    const tenantId = resolveNoticeTenantIdForWrite(req, req.body || {});
    if (!tenantId) {
      return res.status(400).json({ status: false, message: 'tenant_id is required for platform admins.' });
    }
    if (req.adminTenantFilter && String(req.adminTenantFilter) !== tenantId) {
      return res.status(403).json({ status: false, message: 'Cannot publish notices for another college.' });
    }
    const title = String(req.body?.title || '').trim();
    const bodyText = String(req.body?.body ?? '').trim();
    if (!title) {
      return res.status(400).json({ status: false, message: 'Title is required.' });
    }
    const startsAt = req.body?.starts_at ? new Date(req.body.starts_at) : new Date();
    if (Number.isNaN(startsAt.getTime())) {
      return res.status(400).json({ status: false, message: 'Invalid starts_at.' });
    }
    let endsAt = null;
    if (req.body?.ends_at != null && String(req.body.ends_at).trim() !== '') {
      endsAt = new Date(req.body.ends_at);
      if (Number.isNaN(endsAt.getTime())) {
        return res.status(400).json({ status: false, message: 'Invalid ends_at.' });
      }
      if (endsAt < startsAt) {
        return res.status(400).json({ status: false, message: 'ends_at must be on or after starts_at.' });
      }
    }
    const isPinned = Boolean(req.body?.is_pinned);
    const row = await db.TenantNotice.create({
      tenant_id: tenantId,
      created_by_user_id: req.user.id,
      title,
      body: bodyText || null,
      starts_at: startsAt,
      ends_at: endsAt,
      is_pinned: isPinned,
      is_archived: false,
    });
    const plain = row.get({ plain: true });
    return res.status(201).json({
      status: true,
      data: {
        notice: {
          id: plain.id,
          tenant_id: plain.tenant_id,
          title: plain.title,
          body: plain.body,
          starts_at: plain.starts_at,
          ends_at: plain.ends_at,
          is_pinned: plain.is_pinned,
          is_archived: plain.is_archived,
          created_at: plain.created_at,
        },
      },
    });
  } catch (err) {
    console.error('createTenantNotice', err);
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.updateTenantNotice = async (req, res) => {
  try {
    const id = String(req.params.noticeId || '');
    const row = await db.TenantNotice.findByPk(id);
    if (!row) {
      return res.status(404).json({ status: false, message: 'Notice not found.' });
    }
    if (req.adminTenantFilter && String(row.tenant_id) !== String(req.adminTenantFilter)) {
      return res.status(403).json({ status: false, message: 'Access denied.' });
    }
    const patch = {};
    if (req.body.title != null) patch.title = String(req.body.title).trim();
    if (req.body.body != null) patch.body = String(req.body.body).trim() || null;
    if (req.body.starts_at != null) {
      const d = new Date(req.body.starts_at);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ status: false, message: 'Invalid starts_at.' });
      patch.starts_at = d;
    }
    if (req.body.ends_at !== undefined) {
      if (req.body.ends_at == null || String(req.body.ends_at).trim() === '') {
        patch.ends_at = null;
      } else {
        const d = new Date(req.body.ends_at);
        if (Number.isNaN(d.getTime())) return res.status(400).json({ status: false, message: 'Invalid ends_at.' });
        patch.ends_at = d;
      }
    }
    if (typeof req.body.is_pinned === 'boolean') patch.is_pinned = req.body.is_pinned;
    if (typeof req.body.is_archived === 'boolean') patch.is_archived = req.body.is_archived;
    if (Object.keys(patch).length) {
      const nextStarts = patch.starts_at !== undefined ? patch.starts_at : row.starts_at;
      const nextEnds = patch.ends_at !== undefined ? patch.ends_at : row.ends_at;
      if (nextEnds && nextEnds < nextStarts) {
        return res.status(400).json({ status: false, message: 'ends_at must be on or after starts_at.' });
      }
      await row.update(patch);
    }
    await row.reload();
    return res.status(200).json({ status: true, data: { notice: row.get({ plain: true }) } });
  } catch (err) {
    console.error('updateTenantNotice', err);
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.archiveTenantNotice = async (req, res) => {
  try {
    const id = String(req.params.noticeId || '');
    const row = await db.TenantNotice.findByPk(id);
    if (!row) {
      return res.status(404).json({ status: false, message: 'Notice not found.' });
    }
    if (req.adminTenantFilter && String(row.tenant_id) !== String(req.adminTenantFilter)) {
      return res.status(403).json({ status: false, message: 'Access denied.' });
    }
    await row.update({ is_archived: true });
    return res.status(200).json({ status: true, data: { id: row.id, is_archived: true } });
  } catch (err) {
    console.error('archiveTenantNotice', err);
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.getRecentActivity = async (req, res) => {
  try {
    const limit = Math.min(50, parseInt(String(req.query.limit), 10) || 10);
    const tw = tenantWhereClause(req);

    const [recentUsers, recentTenants] = await Promise.all([
      db.User.findAll({
        where: { ...tw },
        attributes: ['id', 'first_name', 'last_name', 'email', 'user_type', 'created_at'],
        order: [['created_at', 'DESC']],
        limit: Math.ceil(limit / 2),
      }),
      req.adminTenantFilter
        ? []
        : db.Tenant.findAll({
            attributes: ['tenant_id', 'name', 'status', 'created_at'],
            order: [['created_at', 'DESC']],
            limit: Math.ceil(limit / 2),
          }),
    ]);

    const activities = [];

    recentUsers.forEach((u) => {
      const j = u.toJSON();
      const name = [j.first_name, j.last_name].filter(Boolean).join(' ') || j.email;
      activities.push({
        id: `u-${j.id}`,
        message: `New ${j.user_type} registered`,
        details: `${name} (${j.email})`,
        timestamp: j.created_at,
        type: 'user',
      });
    });

    recentTenants.forEach((t) => {
      const j = t.toJSON();
      activities.push({
        id: `t-${j.tenant_id}`,
        message: 'College (tenant) record',
        details: `${j.name} — status: ${j.status}`,
        timestamp: j.created_at,
        type: 'tenant',
      });
    });

    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return res.status(200).json({
      status: true,
      data: { activities: activities.slice(0, limit) },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};
