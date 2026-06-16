const bcrypt = require('bcrypt');
const { randomBytes } = require('crypto');
const { Op } = require('sequelize');
const db = require('../database/index');
const postController = require('./postController');
const {
  normalizeSearchQuery,
  stripLikeMetacharacters,
  ilikeContainsPattern,
} = require('../utils/searchQuery');
const {
  descriptorFromMulterFile,
  replaceStoredMedia,
} = require('../services/mediaUploadService');
const { recordMediaAsset } = require('../services/mediaAssetService');
const { resolveMediaUrl } = require('../utils/resolveMediaUrl');
const { enrichUserWithTenantBranding, loadTenantBrandingById } = require('../utils/tenantBranding');
const skillsService = require('../services/skillsService');
const {
  buildAcademicIdentityFromRecord,
  buildAcademicIdentityFields,
  loadAcademicIdentityForUsers,
} = require('../utils/academicIdentity');
const { normalizeAlumniWorkExperience } = require('../utils/alumniProfileHelpers');
const { loadTenantNameMap } = require('../utils/networkHelpers');

async function countAcceptedConnections(userId) {
  return db.Connection.count({
    where: {
      status: 'accepted',
      [Op.or]: [{ sender_id: userId }, { receiver_id: userId }],
    },
  });
}

async function connectionStatusBetween(viewerId, targetId) {
  if (!viewerId || !targetId || String(viewerId) === String(targetId)) {
    return { status: 'self', connection_id: null, direction: null };
  }
  const row = await db.Connection.findOne({
    where: {
      [Op.or]: [
        { sender_id: viewerId, receiver_id: targetId },
        { sender_id: targetId, receiver_id: viewerId },
      ],
    },
  });
  if (!row) return { status: 'none', connection_id: null, direction: null };
  const terminal = ['declined', 'withdrawn', 'removed'];
  if (terminal.includes(row.status)) {
    return { status: 'none', connection_id: row.id, direction: null, last_status: row.status };
  }
  if (row.status === 'accepted') {
    return { status: 'connected', connection_id: row.id, direction: null };
  }
  if (row.status === 'pending') {
    const direction = String(row.sender_id) === String(viewerId) ? 'outgoing' : 'incoming';
    return { status: 'pending', connection_id: row.id, direction };
  }
  return { status: 'none', connection_id: row.id, direction: null };
}

async function canViewerSeeProfile(viewerId, profileUser) {
  const u = profileUser.get ? profileUser.get({ plain: true }) : profileUser;
  if (String(viewerId) === String(u.id)) return true;
  const app = u.app_settings && typeof u.app_settings === 'object' ? u.app_settings : {};
  const vis = app.privacy_settings?.profile_visibility || 'public';
  if (vis === 'private') return false;
  if (vis === 'connections') {
    const st = await connectionStatusBetween(viewerId, u.id);
    return st.status === 'connected';
  }
  return true;
}

function profileHandleFromUser(u) {
  const first = (u.first_name || '').trim();
  const last = (u.last_name || '').trim();
  if (first && last) {
    return `${first.toLowerCase()}${last.charAt(0) ? last.charAt(0).toLowerCase() : ''}`;
  }
  const email = (u.email || '').split('@')[0];
  return email || `user${String(u.id).slice(0, 8)}`;
}

const DEFAULT_PRIVACY = {
  profile_visibility: 'public',
  show_email: false,
  show_phone: false,
  allow_messages: true,
  allow_connection_requests: true,
  show_online_status: true,
  allow_profile_views: true,
};

const DEFAULT_PREFERENCES = {
  theme: 'light',
  language: 'en',
  timezone: 'UTC',
  date_format: 'MM/DD/YYYY',
  time_format: '12h',
  email_frequency: 'immediate',
};

const DEFAULT_SECURITY = {
  two_factor_enabled: false,
  login_notifications: true,
  session_timeout: 60,
};

const DEFAULT_NOTIFICATION_UI = {
  email_notifications: true,
  push_notifications: true,
  sms_notifications: false,
  marketing_emails: false,
  connection_requests: true,
  new_messages: true,
  post_likes: true,
  post_comments: true,
  job_alerts: true,
  learning_reminders: true,
};

function deepMerge(a, b) {
  if (!b || typeof b !== 'object') return a;
  const base = a && typeof a === 'object' && !Array.isArray(a) ? a : {};
  const out = { ...base };
  Object.keys(b).forEach((k) => {
    const bv = b[k];
    const av = out[k];
    if (
      bv != null &&
      typeof bv === 'object' &&
      !Array.isArray(bv) &&
      av != null &&
      typeof av === 'object' &&
      !Array.isArray(av)
    ) {
      out[k] = deepMerge(av, bv);
    } else if (bv !== undefined) {
      out[k] = bv;
    }
  });
  return out;
}

function titleFromUserType(user_type) {
  if (user_type === 'student') return 'Student';
  if (user_type === 'teacher') return 'Teacher';
  if (user_type === 'alumni') return 'Alumni';
  if (user_type === 'staff') return 'Staff';
  return 'User';
}

function notificationRowToUi(row) {
  if (!row) return { ...DEFAULT_NOTIFICATION_UI };
  const nt = row.notification_types || {};
  const social = nt.social || {};
  const professional = nt.professional || {};
  const messages = nt.messages || {};
  const learning = nt.learning || {};
  const system = nt.system || {};
  return {
    email_notifications: !!row.email_notifications,
    push_notifications: !!row.push_notifications,
    sms_notifications: row.sms_notifications !== undefined ? !!row.sms_notifications : false,
    marketing_emails: system.marketing_emails === true,
    connection_requests: professional.connection_request !== false,
    new_messages: messages.message !== false,
    post_likes: social.like !== false,
    post_comments: social.comment !== false,
    job_alerts: professional.job_application !== false,
    learning_reminders: learning.event_reminder !== false,
  };
}

async function applyNotificationUiPatch(userId, partial) {
  let row = await db.NotificationSetting.findOne({ where: { user_id: userId } });
  if (!row) {
    row = await db.NotificationSetting.create({
      user_id: userId,
      email_notifications: true,
      push_notifications: true,
      in_app_notifications: true,
    });
  }
  const nt = JSON.parse(JSON.stringify(row.notification_types || {}));
  nt.social = nt.social || {};
  nt.professional = nt.professional || {};
  nt.messages = nt.messages || {};
  nt.learning = nt.learning || {};
  nt.system = nt.system || {};

  const updates = {};
  if (partial.email_notifications !== undefined)
    updates.email_notifications = !!partial.email_notifications;
  if (partial.push_notifications !== undefined)
    updates.push_notifications = !!partial.push_notifications;
  if (partial.sms_notifications !== undefined) updates.sms_notifications = !!partial.sms_notifications;

  if (partial.marketing_emails !== undefined) nt.system.marketing_emails = !!partial.marketing_emails;
  if (partial.connection_requests !== undefined)
    nt.professional.connection_request = !!partial.connection_requests;
  if (partial.new_messages !== undefined) nt.messages.message = !!partial.new_messages;
  if (partial.post_likes !== undefined) nt.social.like = !!partial.post_likes;
  if (partial.post_comments !== undefined) nt.social.comment = !!partial.post_comments;
  if (partial.job_alerts !== undefined) nt.professional.job_application = !!partial.job_alerts;
  if (partial.learning_reminders !== undefined) {
    nt.learning.event_reminder = !!partial.learning_reminders;
    nt.learning.course_enrollment = !!partial.learning_reminders;
  }

  updates.notification_types = nt;
  await row.update(updates);
  await row.reload();
  return row;
}

function publicShape(user) {
  const u = user.get ? user.get({ plain: true }) : { ...user };
  delete u.password_hash;
  return {
    id: String(u.id),
    email: u.email,
    name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email,
    first_name: u.first_name || '',
    last_name: u.last_name || '',
    user_type: u.user_type,
    role: u.user_type,
    tenant_id: u.tenant_id != null ? String(u.tenant_id) : '',
    avatar_url: u.profile_picture ? resolveMediaUrl(u.profile_picture) : undefined,
  };
}

/** Directory search — omit email from JSON for privacy */
function searchUserPublicShape(user) {
  const s = publicShape(user);
  delete s.email;
  return s;
}

async function buildProfilePayload(userRecord, options = {}) {
  const { includePrivate = true, viewerId = null } = options;
  const u = userRecord.get ? userRecord.get({ plain: true }) : { ...userRecord };

  const [postsCount, likesSum, connectionsCount] = await Promise.all([
    db.Post.count({ where: { user_id: u.id } }),
    db.Post.sum('likes_count', { where: { user_id: u.id } }),
    countAcceptedConnections(u.id),
  ]);
  const likesReceived = likesSum || 0;

  const sd = u.studentDetails;
  const td = u.teacherDetails;
  const ad = u.alumniDetails;

  let company = null;
  let position = null;
  let experience = null;
  let skills = [];

  if (u.user_type === 'alumni' && ad) {
    company = ad.company_name || null;
    position = ad.current_job_title || null;
    experience = ad.work_experience || null;
    skills = Array.isArray(ad.skills) ? ad.skills : [];
  } else if (u.user_type === 'teacher' && td) {
    company = td.department || null;
    position = td.designation || null;
    skills = Array.isArray(td.area_of_expertise) ? td.area_of_expertise : [];
  }

  const completionFields = [
    u.first_name,
    u.last_name,
    u.profile_picture,
    u.bio,
    u.location,
    u.phone_number,
    u.linkedin_url || u.github_url || u.website_url,
    sd?.stream,
    sd?.degree,
    company,
  ].filter(Boolean);
  const profile_completion = Math.min(
    100,
    Math.round((completionFields.length / 8) * 100)
  );

  const appSettings =
    u.app_settings && typeof u.app_settings === 'object' ? u.app_settings : {};
  const academicExtra =
    appSettings.academic_extra && typeof appSettings.academic_extra === 'object'
      ? appSettings.academic_extra
      : {};

  const body = {
    id: String(u.id),
    first_name: u.first_name || '',
    last_name: u.last_name || '',
    name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email,
    user_type: u.user_type,
    title:
      u.user_type === 'student'
        ? 'Student'
        : u.user_type === 'teacher'
          ? 'Teacher'
          : u.user_type === 'alumni'
            ? 'Alumni'
            : u.user_type === 'staff'
              ? 'Staff'
              : 'User',
    avatar_url: u.profile_picture ? resolveMediaUrl(u.profile_picture) : null,
    cover_image_url: u.cover_picture ? resolveMediaUrl(u.cover_picture) : null,
    bio: u.bio || null,
    location: u.location || null,
    website_url: u.website_url || null,
    linkedin_url: u.linkedin_url || null,
    twitter_url: u.twitter_url || null,
    github_url: u.github_url || null,
    posts_count: postsCount,
    followers_count: connectionsCount,
    following_count: connectionsCount,
    likes_count: likesReceived,
    connections_count: connectionsCount,
    username: profileHandleFromUser(u),
    profile_views: 0,
    post_views: 0,
    enrollment_year: sd?.year && /^\d{4}$/.test(String(sd.year)) ? parseInt(String(sd.year), 10) : undefined,
    student_year: sd?.year || null,
    current_semester: sd?.semester || null,
    passout_year: sd?.passout_date ? new Date(sd.passout_date).getFullYear() : null,
    course: sd?.stream || ad?.stream || null,
    department: sd?.degree || ad?.degree || null,
    graduation_year: ad?.graduation_year || null,
    academic_batch: sd?.academic_batch || ad?.academic_batch || null,
    designation: td?.designation || null,
    teacher_department: td?.department || null,
    academic_year: sd?.year || null,
    branch: sd?.stream || ad?.stream || null,
    university: null,
    company,
    position,
    experience,
    skills,
    certifications: [],
    achievements: [],
    clubs: [],
    events: [],
    projects: [],
    is_premium: false,
    is_verified: false,
    profile_completion,
    onboarding_completed: !!appSettings.onboarding_completed,
    onboarding_step: Number(appSettings.onboarding_step) || 0,
    college_email: appSettings.college_email || null,
    academic_extra: academicExtra,
    created_at: u.created_at,
  };

  if (u.tenant_id) {
    const tenantBrand = await loadTenantBrandingById(u.tenant_id);
    if (tenantBrand) {
      body.tenant_id = tenantBrand.tenant_id;
      body.tenant_name = tenantBrand.name;
      body.tenant_logo_url = tenantBrand.logo_url;
      body.university = tenantBrand.name;
    }
  }

  const identityFields = buildAcademicIdentityFields(
    u.user_type,
    sd,
    td,
    ad,
    body.tenant_name || null,
  );
  body.academic_identity = identityFields.academic_identity;
  body.professional_identity = identityFields.professional_identity;
  body.degree = identityFields.degree;
  body.branch = identityFields.branch;
  body.academic_year = identityFields.academic_year;
  body.graduation_batch = identityFields.graduation_batch;
  if (identityFields.designation) body.designation = identityFields.designation;
  if (identityFields.department && u.user_type === 'teacher') {
    body.teacher_department = identityFields.department;
  }
  if (identityFields.company) body.company = identityFields.company;
  if (identityFields.position) body.position = identityFields.position;

  if (!body.academic_identity) {
    body.academic_identity = buildAcademicIdentityFromRecord(u);
  }

  const privacy = deepMerge(
    DEFAULT_PRIVACY,
    (u.app_settings && typeof u.app_settings === 'object' ? u.app_settings.privacy_settings : null) || {},
  );
  body.show_email = !!privacy.show_email;
  body.show_phone = !!privacy.show_phone;

  if (includePrivate) {
    body.email = u.email;
    body.phone = u.phone_number || null;
  } else {
    if (privacy.show_email) body.email = u.email;
    if (privacy.show_phone) body.phone = u.phone_number || null;
  }

  if (viewerId && String(viewerId) !== String(u.id)) {
    const rel = await connectionStatusBetween(viewerId, u.id);
    body.connection_status = rel.status;
    body.connection_id = rel.connection_id;
    body.connection_direction = rel.direction;
  } else if (viewerId && String(viewerId) === String(u.id)) {
    body.connection_status = 'self';
  }

  try {
    const [aboutRow, exps, edus, achs, uSkills, teachRow] = await Promise.all([
      db.UserAbout.findOne({ where: { user_id: u.id } }),
      db.UserExperience.findAll({
        where: { user_id: u.id },
        order: [
          ['sort_order', 'ASC'],
          ['created_at', 'ASC'],
        ],
      }),
      db.UserEducation.findAll({
        where: { user_id: u.id },
        order: [
          ['sort_order', 'ASC'],
          ['created_at', 'ASC'],
        ],
      }),
      db.UserAchievement.findAll({
        where: { user_id: u.id },
        order: [
          ['sort_order', 'ASC'],
          ['created_at', 'ASC'],
        ],
      }),
      db.UserSkill.findAll({
        where: { user_id: u.id },
        order: [
          ['sort_order', 'ASC'],
          ['created_at', 'ASC'],
        ],
      }),
      u.user_type === 'teacher'
        ? db.UserTeachingInfo.findOne({ where: { user_id: u.id } })
        : Promise.resolve(null),
    ]);

    if (aboutRow) {
      const ar = aboutRow.get ? aboutRow.get({ plain: true }) : aboutRow;
      if (ar.headline) body.headline = ar.headline;
      if (ar.bio) body.bio = ar.bio;
      if (ar.location) body.location = ar.location;
      if (ar.website && !body.website_url) body.website_url = ar.website;
    }

    if (exps && exps.length) {
      const experienceService = require('../services/experienceService');
      body.experience_list = exps
        .map((e) => experienceService.mapExperienceForApi(e))
        .sort(experienceService.compareExperienceRows);
      const summary = [...new Set(
        body.experience_list.map(
          (e) => `${e.title}${e.company ? ` @ ${e.company}` : ''}${e.duration ? ` (${e.duration})` : ''}`,
        ),
      )].join(' · ');
      if (summary) body.experience = summary;
    } else {
      body.experience_list = [];
    }

    if (edus && edus.length) {
      const educationService = require('../services/educationService');
      const eduIds = edus.map((e) => e.id);
      const skillsMap = await educationService.loadEducationSkills(eduIds);
      body.education_list = edus
        .map((e) => educationService.mapEducationForApi(e, skillsMap))
        .sort(educationService.compareEducationRows);
    } else {
      body.education_list = [];
    }

    if (achs && achs.length) {
      body.achievements = achs.map((a) => {
        const x = a.get ? a.get({ plain: true }) : a;
        return { id: String(x.id), title: x.title, description: x.description || '' };
      });
    }

    if (uSkills && uSkills.length) {
      body.skills_detailed = uSkills.map((s) => {
        const x = s.get ? s.get({ plain: true }) : s;
        let lvl = x.level != null ? Number(x.level) : null;
        if (lvl != null && !Number.isNaN(lvl)) {
          if (lvl > 10) lvl = Math.min(10, Math.max(0, Math.round(lvl / 10)));
          else lvl = Math.min(10, Math.max(0, Math.round(lvl)));
        } else {
          lvl = null;
        }
        return { id: String(x.id), name: x.skill_name, level: lvl };
      });
      body.skills = body.skills_detailed.map((s) => s.name);
    }

    if (teachRow && u.user_type === 'teacher') {
      const t = teachRow.get ? teachRow.get({ plain: true }) : teachRow;
      body.teaching_info = {
        subjects: Array.isArray(t.subjects) ? t.subjects : [],
        experience_years: t.experience_years != null ? Number(t.experience_years) : null,
        notes: t.notes || '',
      };
    }
  } catch (err) {
    console.error('buildProfilePayload profile sections', err);
  }

  return body;
}

exports.getMe = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: db.StudentDetail, as: 'studentDetails', required: false },
        { model: db.TeacherDetail, as: 'teacherDetails', required: false },
        { model: db.AlumniDetail, as: 'alumniDetails', required: false },
      ],
    });
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }
    const shaped = publicShape(user);
    shaped.avatar_url = user.profile_picture
      ? resolveMediaUrl(user.profile_picture)
      : shaped.avatar_url;
    const data = await enrichUserWithTenantBranding(shaped);
    return res.status(200).json({ status: true, data });
  } catch (e) {
    return res.status(500).json({ status: false, message: e.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: db.StudentDetail, as: 'studentDetails', required: false },
        { model: db.TeacherDetail, as: 'teacherDetails', required: false },
        { model: db.AlumniDetail, as: 'alumniDetails', required: false },
      ],
    });
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }
    const body = await buildProfilePayload(user, { includePrivate: true });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ status: true, data: body });
  } catch (e) {
    console.error('getProfile', e);
    return res.status(500).json({ status: false, message: e.message });
  }
};

exports.getPublicProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const isSelf = String(req.user.id) === String(userId);

    const user = await db.User.findByPk(userId, {
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: db.StudentDetail, as: 'studentDetails', required: false },
        { model: db.TeacherDetail, as: 'teacherDetails', required: false },
        { model: db.AlumniDetail, as: 'alumniDetails', required: false },
      ],
    });
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }

    if (!isSelf) {
      const allowed = await canViewerSeeProfile(req.user.id, user);
      if (!allowed) {
        return res.status(403).json({
          status: false,
          message: 'This profile is private or visible to connections only.',
        });
      }
    }

    const body = await buildProfilePayload(user, {
      includePrivate: isSelf,
      viewerId: req.user.id,
    });
    return res.status(200).json({ status: true, data: body });
  } catch (e) {
    console.error('getPublicProfile', e);
    return res.status(500).json({ status: false, message: e.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }
    const {
      first_name,
      last_name,
      phone_number,
      course,
      department,
      bio,
      location,
      website_url,
      linkedin_url,
      twitter_url,
      github_url,
      company,
      position,
      experience,
    } = req.body;

    const updates = {};
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (phone_number !== undefined) updates.phone_number = phone_number;
    if (bio !== undefined) updates.bio = bio;
    if (location !== undefined) updates.location = location;
    if (website_url !== undefined) updates.website_url = website_url || null;
    if (linkedin_url !== undefined) updates.linkedin_url = linkedin_url || null;
    if (twitter_url !== undefined) updates.twitter_url = twitter_url || null;
    if (github_url !== undefined) updates.github_url = github_url || null;

    if (Object.keys(updates).length) {
      await user.update(updates);
    }

    if (user.user_type === 'student' && (course !== undefined || department !== undefined)) {
      const [detail] = await db.StudentDetail.findOrCreate({ where: { user_id: user.id } });
      const dUp = {};
      if (course !== undefined) dUp.stream = course;
      if (department !== undefined) dUp.degree = department;
      if (Object.keys(dUp).length) await detail.update(dUp);
    }

    if (
      user.user_type === 'alumni' &&
      (company !== undefined || position !== undefined || experience !== undefined)
    ) {
      const [detail] = await db.AlumniDetail.findOrCreate({ where: { user_id: user.id } });
      const dUp = {};
      if (company !== undefined) dUp.company_name = company;
      if (position !== undefined) dUp.current_job_title = position;
      if (experience !== undefined) dUp.work_experience = normalizeAlumniWorkExperience(experience);
      if (Object.keys(dUp).length) await detail.update(dUp);
    }

    await user.reload({
      include: [
        { model: db.StudentDetail, as: 'studentDetails', required: false },
        { model: db.TeacherDetail, as: 'teacherDetails', required: false },
        { model: db.AlumniDetail, as: 'alumniDetails', required: false },
      ],
    });

    const body = await buildProfilePayload(user, { includePrivate: true });
    return res.status(200).json({ status: true, data: body, message: 'Profile updated.' });
  } catch (e) {
    return res.status(500).json({ status: false, message: e.message });
  }
};

exports.updateOnboardingProfile = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }

    const {
      step,
      complete,
      skip,
      bio,
      location,
      phone_number,
      linkedin_url,
      github_url,
      website_url,
      degree,
      branch,
      year,
      semester,
      graduation_year,
      roll_number,
      university_name,
      student_id,
      cgpa,
      percentage,
      admission_year,
      company,
      position,
      industry,
      experience,
      department,
      designation,
      qualification,
      employee_id,
      faculty_id,
      joining_date,
      teaching_experience,
      research_areas,
      skills,
    } = req.body;

    const userUpdates = {};
    if (bio !== undefined) userUpdates.bio = bio || null;
    if (location !== undefined) userUpdates.location = location || null;
    if (phone_number !== undefined) userUpdates.phone_number = phone_number || null;
    if (linkedin_url !== undefined) userUpdates.linkedin_url = linkedin_url || null;
    if (github_url !== undefined) userUpdates.github_url = github_url || null;
    if (website_url !== undefined) userUpdates.website_url = website_url || null;
    if (Object.keys(userUpdates).length) {
      await user.update(userUpdates);
    }

    if (user.user_type === 'student') {
      const [detail] = await db.StudentDetail.findOrCreate({ where: { user_id: user.id } });
      const dUp = {};
      if (degree !== undefined) dUp.degree = degree || null;
      if (branch !== undefined) dUp.stream = branch || null;
      if (year !== undefined) dUp.year = year || null;
      if (semester !== undefined) dUp.semester = semester || null;
      if (graduation_year !== undefined) {
        const yr = String(graduation_year || '').trim();
        dUp.passout_date = yr && /^\d{4}$/.test(yr) ? new Date(`${yr}-06-01`) : null;
      }
      if (Object.keys(dUp).length) await detail.update(dUp);
    }

    if (user.user_type === 'alumni') {
      const [detail] = await db.AlumniDetail.findOrCreate({ where: { user_id: user.id } });
      const dUp = {};
      if (degree !== undefined) dUp.degree = degree || null;
      if (branch !== undefined) dUp.stream = branch || null;
      if (roll_number !== undefined) dUp.roll_number = roll_number || null;
      if (graduation_year !== undefined) {
        const yr = String(graduation_year || '').trim();
        dUp.year_of_graduation = yr && /^\d{4}$/.test(yr) ? new Date(`${yr}-06-01`) : null;
      }
      if (company !== undefined) dUp.company_name = company || null;
      if (position !== undefined) dUp.current_job_title = position || null;
      if (industry !== undefined) dUp.industry = industry || null;
      if (experience !== undefined) dUp.work_experience = normalizeAlumniWorkExperience(experience);
      if (linkedin_url !== undefined) dUp.linkedin_profile = linkedin_url || null;
      if (github_url !== undefined) dUp.github_portfolio = github_url || null;
      if (Object.keys(dUp).length) await detail.update(dUp);
    }

    if (user.user_type === 'teacher') {
      const [detail] = await db.TeacherDetail.findOrCreate({ where: { user_id: user.id } });
      const dUp = {};
      if (department !== undefined) dUp.department = department || null;
      if (designation !== undefined) dUp.designation = designation || null;
      if (qualification !== undefined) dUp.qualification = qualification || null;
      if (joining_date !== undefined) dUp.joining_date = joining_date || null;
      if (teaching_experience !== undefined) {
        dUp.years_of_experience = teaching_experience || null;
        const yrs = parseInt(String(teaching_experience), 10);
        if (!Number.isNaN(yrs)) dUp.experience_years = yrs;
      }
      if (research_areas !== undefined) dUp.research_interests = research_areas || null;
      if (linkedin_url !== undefined) dUp.linkedin_profile = linkedin_url || null;
      if (Object.keys(dUp).length) await detail.update(dUp);
    }

    if (Array.isArray(skills)) {
      for (const raw of skills.slice(0, 12)) {
        const skill_name = String(raw || '').trim();
        if (!skill_name) continue;
        try {
          await skillsService.assignSkillToUser(user.id, { skill_name });
        } catch (skillErr) {
          console.warn('onboarding skill assign', skillErr.message);
        }
      }
    }

    let app = user.app_settings && typeof user.app_settings === 'object' ? { ...user.app_settings } : {};
    const academicExtra = {
      ...(app.academic_extra && typeof app.academic_extra === 'object' ? app.academic_extra : {}),
    };
    if (university_name !== undefined) academicExtra.university_name = university_name || null;
    if (student_id !== undefined) academicExtra.student_id = student_id || null;
    if (roll_number !== undefined && user.user_type === 'student') {
      academicExtra.roll_number = roll_number || null;
    }
    if (cgpa !== undefined) academicExtra.cgpa = cgpa || null;
    if (percentage !== undefined) academicExtra.percentage = percentage || null;
    if (admission_year !== undefined) academicExtra.admission_year = admission_year || null;
    if (graduation_year !== undefined) {
      const yr = String(graduation_year || '').trim();
      academicExtra.graduation_year = yr || null;
    }
    if (employee_id !== undefined) academicExtra.employee_id = employee_id || null;
    if (faculty_id !== undefined) academicExtra.faculty_id = faculty_id || null;
    if (industry !== undefined) academicExtra.industry = industry || null;
    if (qualification !== undefined && user.user_type === 'teacher') {
      academicExtra.qualification = qualification || null;
    }
    if (teaching_experience !== undefined) {
      academicExtra.teaching_experience = teaching_experience || null;
    }
    if (research_areas !== undefined) {
      academicExtra.research_areas = research_areas || null;
    }
    app.academic_extra = academicExtra;

    if (step !== undefined) app.onboarding_step = Math.max(0, parseInt(String(step), 10) || 0);
    if (complete || skip) {
      app.onboarding_completed = true;
      app.onboarding_completed_at = new Date().toISOString();
    }

    await user.update({ app_settings: app });

    await user.reload({
      include: [
        { model: db.StudentDetail, as: 'studentDetails', required: false },
        { model: db.TeacherDetail, as: 'teacherDetails', required: false },
        { model: db.AlumniDetail, as: 'alumniDetails', required: false },
      ],
    });

    const body = await buildProfilePayload(user, { includePrivate: true });
    return res.status(200).json({
      status: true,
      data: body,
      message: skip ? 'You can complete your profile anytime from Settings.' : 'Profile updated.',
    });
  } catch (e) {
    console.error('updateOnboardingProfile', e);
    return res.status(500).json({ status: false, message: e.message });
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: false, message: 'No file uploaded.' });
    }
    const user = await db.User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }
    await replaceStoredMedia(user.profile_picture);
    const descriptor = await descriptorFromMulterFile(req.file, 'avatar');
    await user.update({ profile_picture: descriptor.url });
    void recordMediaAsset(descriptor, {
      ownerId: user.id,
      category: 'avatar',
      entityType: 'user',
      entityId: user.id,
    });
    return res.status(200).json({
      status: true,
      message: 'Profile photo updated.',
      data: { avatar_url: resolveMediaUrl(descriptor.url) },
    });
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({ status: false, message: e.message });
  }
};

exports.uploadCover = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: false, message: 'No file uploaded.' });
    }
    const user = await db.User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }
    await replaceStoredMedia(user.cover_picture);
    const descriptor = await descriptorFromMulterFile(req.file, 'cover');
    await user.update({ cover_picture: descriptor.url });
    void recordMediaAsset(descriptor, {
      ownerId: user.id,
      category: 'cover',
      entityType: 'user',
      entityId: user.id,
    });
    return res.status(200).json({
      status: true,
      message: 'Cover image updated.',
      data: { cover_image_url: resolveMediaUrl(descriptor.url) },
    });
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({ status: false, message: e.message });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id, { attributes: { exclude: ['password_hash'] } });
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }
    const u = user.get({ plain: true });
    const app = u.app_settings && typeof u.app_settings === 'object' ? u.app_settings : {};
    const privacy_settings = deepMerge(DEFAULT_PRIVACY, app.privacy_settings || {});
    const preferences = deepMerge(DEFAULT_PREFERENCES, app.preferences || {});
    const security_settings = {
      ...deepMerge(DEFAULT_SECURITY, app.security_settings || {}),
      password_last_changed: (u.password_changed_at || u.updated_at || u.created_at || new Date()).toString(),
    };

    const notifRow = await db.NotificationSetting.findOne({ where: { user_id: u.id } });
    const notification_settings = notificationRowToUi(notifRow);

    const data = {
      id: String(u.id),
      name: [u.first_name, u.last_name].filter(Boolean).join(' ') || '',
      email: u.email,
      phone: u.phone_number || '',
      avatar_url: u.profile_picture ? resolveMediaUrl(u.profile_picture) : '',
      title: titleFromUserType(u.user_type),
      bio: u.bio || '',
      location: u.location || '',
      website: u.website_url || '',
      notification_settings,
      privacy_settings,
      preferences,
      security_settings,
    };
    return res.status(200).json({ status: true, data });
  } catch (e) {
    return res.status(500).json({ status: false, message: e.message });
  }
};

exports.updateUserSettings = async (req, res) => {
  try {
    const { privacy_settings, preferences, security_settings, notification_settings } = req.body;
    if (
      privacy_settings === undefined &&
      preferences === undefined &&
      security_settings === undefined &&
      notification_settings === undefined
    ) {
      return res.status(400).json({ status: false, message: 'No settings provided to update.' });
    }

    const user = await db.User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ status: false, message: 'User not found.' });

    let app = user.app_settings && typeof user.app_settings === 'object' ? { ...user.app_settings } : {};

    if (privacy_settings && typeof privacy_settings === 'object') {
      if (privacy_settings.profile_visibility !== undefined) {
        const v = String(privacy_settings.profile_visibility);
        if (!['public', 'private', 'connections'].includes(v)) {
          return res.status(400).json({ status: false, message: 'Invalid profile_visibility.' });
        }
      }
      app.privacy_settings = deepMerge(
        DEFAULT_PRIVACY,
        deepMerge(app.privacy_settings || {}, privacy_settings)
      );
    }

    if (preferences && typeof preferences === 'object') {
      const th = preferences.theme;
      if (th !== undefined && !['light', 'dark', 'auto'].includes(String(th))) {
        return res.status(400).json({ status: false, message: 'Invalid theme.' });
      }
      const ef = preferences.email_frequency;
      if (ef !== undefined && !['immediate', 'daily', 'weekly'].includes(String(ef))) {
        return res.status(400).json({ status: false, message: 'Invalid email_frequency.' });
      }
      const tf = preferences.time_format;
      if (tf !== undefined && !['12h', '24h'].includes(String(tf))) {
        return res.status(400).json({ status: false, message: 'Invalid time_format.' });
      }
      app.preferences = deepMerge(
        DEFAULT_PREFERENCES,
        deepMerge(app.preferences || {}, preferences)
      );
    }

    if (security_settings && typeof security_settings === 'object') {
      const nextSec = { ...security_settings };
      delete nextSec.password_last_changed;
      if (nextSec.session_timeout !== undefined) {
        const n = parseInt(String(nextSec.session_timeout), 10);
        if (Number.isNaN(n) || n < 5 || n > 10080) {
          return res.status(400).json({
            status: false,
            message: 'session_timeout must be between 5 and 10080 minutes.',
          });
        }
        nextSec.session_timeout = n;
      }
      app.security_settings = deepMerge(
        DEFAULT_SECURITY,
        deepMerge(app.security_settings || {}, nextSec)
      );
    }

    if (notification_settings && typeof notification_settings === 'object') {
      await applyNotificationUiPatch(req.user.id, notification_settings);
    }

    await user.update({ app_settings: app });
    await user.reload({ attributes: { exclude: ['password_hash'] } });

    const notifRow = await db.NotificationSetting.findOne({ where: { user_id: user.id } });
    const plain = user.get({ plain: true });
    const appOut = plain.app_settings && typeof plain.app_settings === 'object' ? plain.app_settings : {};
    const data = {
      id: String(plain.id),
      name: [plain.first_name, plain.last_name].filter(Boolean).join(' ') || '',
      email: plain.email,
      phone: plain.phone_number || '',
      avatar_url: plain.profile_picture ? resolveMediaUrl(plain.profile_picture) : '',
      title: titleFromUserType(plain.user_type),
      bio: plain.bio || '',
      location: plain.location || '',
      website: plain.website_url || '',
      notification_settings: notificationRowToUi(notifRow),
      privacy_settings: deepMerge(DEFAULT_PRIVACY, appOut.privacy_settings || {}),
      preferences: deepMerge(DEFAULT_PREFERENCES, appOut.preferences || {}),
      security_settings: {
        ...deepMerge(DEFAULT_SECURITY, appOut.security_settings || {}),
        password_last_changed: (plain.password_changed_at || plain.updated_at || new Date()).toISOString(),
      },
    };
    return res.status(200).json({ status: true, data, message: 'Settings updated.' });
  } catch (e) {
    return res.status(500).json({ status: false, message: e.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res
        .status(400)
        .json({ status: false, message: 'current_password and new_password are required.' });
    }
    if (String(new_password).length < 8) {
      return res.status(400).json({
        status: false,
        message: 'New password must be at least 8 characters.',
      });
    }
    if (String(new_password) === String(current_password)) {
      return res.status(400).json({
        status: false,
        message: 'New password must differ from your current password.',
      });
    }
    const user = await db.User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ status: false, message: 'User not found.' });
    const ok = await bcrypt.compare(String(current_password), user.password_hash);
    if (!ok) {
      return res.status(401).json({ status: false, message: 'Current password is incorrect.' });
    }
    const password_hash = await bcrypt.hash(String(new_password), 10);
    await user.update({ password_hash, password_changed_at: new Date() });
    return res.status(200).json({ status: true, message: 'Password updated successfully.' });
  } catch (e) {
    return res.status(500).json({ status: false, message: e.message });
  }
};

exports.exportUserData = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: db.StudentDetail, as: 'studentDetails', required: false },
        { model: db.TeacherDetail, as: 'teacherDetails', required: false },
        { model: db.AlumniDetail, as: 'alumniDetails', required: false },
      ],
    });
    if (!user) return res.status(404).json({ status: false, message: 'User not found.' });
    const profile = await buildProfilePayload(user, { includePrivate: true });
    const notifRow = await db.NotificationSetting.findOne({ where: { user_id: user.id } });
    const postsCount = await db.Post.count({ where: { user_id: user.id } });
    const u = user.get({ plain: true });
    const app = u.app_settings || {};
    return res.status(200).json({
      status: true,
      data: {
        exported_at: new Date().toISOString(),
        profile,
        posts_count: postsCount,
        privacy_settings: deepMerge(DEFAULT_PRIVACY, app.privacy_settings || {}),
        preferences: deepMerge(DEFAULT_PREFERENCES, app.preferences || {}),
        notification_settings: notificationRowToUi(notifRow),
      },
    });
  } catch (e) {
    return res.status(500).json({ status: false, message: e.message });
  }
};

exports.closeAccount = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res
        .status(400)
        .json({ status: false, message: 'password is required to close your account.' });
    }
    const user = await db.User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ status: false, message: 'User not found.' });
    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) {
      return res.status(401).json({ status: false, message: 'Password is incorrect.' });
    }
    const junk = randomBytes(24).toString('hex');
    const newHash = await bcrypt.hash(junk, 10);
    await user.update({
      email: `deleted_${user.id}@closed.invalid`,
      password_hash: newHash,
      first_name: 'Former',
      last_name: 'User',
      phone_number: null,
      bio: null,
      profile_picture: null,
      cover_picture: null,
      linkedin_url: null,
      twitter_url: null,
      github_url: null,
      website_url: null,
      location: null,
      is_approved: false,
      app_settings: {},
      password_changed_at: new Date(),
    });
    await db.NotificationSetting.destroy({ where: { user_id: user.id } });
    return res.status(200).json({
      status: true,
      message: 'Account closed. Sign-in with your old email will no longer work.',
    });
  } catch (e) {
    return res.status(500).json({ status: false, message: e.message });
  }
};

/** Accepted connections list for a member's profile (privacy-aware). */
exports.getUserConnections = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(50, parseInt(String(req.query.limit), 10) || 24);

    const user = await db.User.findByPk(userId, {
      attributes: ['id', 'app_settings'],
    });
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }

    const isSelf = String(req.user.id) === String(userId);
    if (!isSelf) {
      const allowed = await canViewerSeeProfile(req.user.id, user);
      if (!allowed) {
        return res.status(403).json({ status: false, message: 'Connections are not visible.' });
      }
    }

    const rows = await db.Connection.findAll({
      where: {
        status: 'accepted',
        [Op.or]: [{ sender_id: userId }, { receiver_id: userId }],
      },
      order: [['updated_at', 'DESC']],
      limit,
    });

    const otherIds = rows.map((r) => {
      const j = r.toJSON();
      return String(j.sender_id) === String(userId) ? j.receiver_id : j.sender_id;
    });

    const users = await db.User.findAll({
      where: { id: { [Op.in]: otherIds } },
      attributes: ['id', 'first_name', 'last_name', 'user_type', 'profile_picture', 'bio', 'tenant_id'],
    });

    const byId = new Map(users.map((u) => [String(u.id), u]));
    const connections = otherIds
      .map((oid) => {
        const u = byId.get(String(oid));
        if (!u) return null;
        const plain = u.get({ plain: true });
        return {
          id: String(plain.id),
          name: [plain.first_name, plain.last_name].filter(Boolean).join(' ') || 'User',
          user_type: plain.user_type,
          avatar_url: plain.profile_picture ? resolveMediaUrl(plain.profile_picture) : null,
          bio: plain.bio || '',
          tenant_id: plain.tenant_id != null ? String(plain.tenant_id) : null,
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      status: true,
      data: { connections, total: connections.length },
    });
  } catch (e) {
    console.error('getUserConnections', e);
    return res.status(500).json({ status: false, message: e.message });
  }
};

exports.getUserStatsById = async (req, res) => {
  try {
    const { userId } = req.params;
    const [posts, likesReceived, connectionsCount] = await Promise.all([
      db.Post.count({ where: { user_id: userId } }),
      db.Post.sum('likes_count', { where: { user_id: userId } }),
      db.Connection.count({
        where: {
          status: 'accepted',
          [Op.or]: [{ sender_id: userId }, { receiver_id: userId }],
        },
      }),
    ]);
    return res.status(200).json({
      status: true,
      data: {
        posts_count: posts,
        followers_count: connectionsCount,
        following_count: connectionsCount,
        connections_count: connectionsCount,
        likes_count: likesReceived || 0,
      },
    });
  } catch (e) {
    return res.status(500).json({ status: false, message: e.message });
  }
};

/** Authenticated user's compact stats for home right sidebar */
exports.getMeSidebarSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const [posts_count, likes_received, connections_count, user] = await Promise.all([
      db.Post.count({ where: { user_id: userId } }),
      db.Post.sum('likes_count', { where: { user_id: userId } }),
      db.Connection.count({
        where: {
          status: 'accepted',
          [Op.or]: [{ sender_id: userId }, { receiver_id: userId }],
        },
      }),
      db.User.findByPk(userId, {
        attributes: ['location', 'first_name', 'last_name', 'profile_picture', 'cover_picture'],
      }),
    ]);

    return res.status(200).json({
      status: true,
      data: {
        posts_count,
        connections_count,
        likes_received: likes_received || 0,
        location: user?.location || null,
        cover_image_url: user?.cover_picture ? resolveMediaUrl(user.cover_picture) : null,
      },
    });
  } catch (e) {
    console.error('getMeSidebarSummary', e);
    return res.status(500).json({ status: false, message: e.message });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const qRaw = req.query.q || req.query.search;
    const needle = normalizeSearchQuery(qRaw);
    const inner = stripLikeMetacharacters(needle);
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
    const offset = (page - 1) * limit;

    if (!inner) {
      return res.status(200).json({
        status: true,
        data: {
          users: [],
          pagination: { total: 0, page, pages: 1, limit },
        },
      });
    }

    const pat = ilikeContainsPattern(inner);
    if (!pat) {
      return res.status(200).json({
        status: true,
        data: {
          users: [],
          pagination: { total: 0, page, pages: 1, limit },
        },
      });
    }

    const excludeIds = new Set([String(req.user.id)]);
    const blocks = await db.UserBlock.findAll({
      where: {
        [Op.or]: [
          { blocker_id: req.user.id },
          { blocked_user_id: req.user.id },
        ],
      },
      attributes: ['blocker_id', 'blocked_user_id'],
    });
    for (const b of blocks) {
      const other =
        String(b.blocker_id) === String(req.user.id) ? b.blocked_user_id : b.blocker_id;
      excludeIds.add(String(other));
    }

    const where = {
      id: { [Op.notIn]: [...excludeIds] },
      is_approved: true,
      [Op.or]: [
        { first_name: { [Op.iLike]: pat } },
        { last_name: { [Op.iLike]: pat } },
        { email: { [Op.iLike]: pat } },
        { bio: { [Op.iLike]: pat } },
      ],
    };

    if (req.query.role || req.query.user_type) {
      where.user_type = String(req.query.role || req.query.user_type);
    }
    if (req.query.tenant_id !== undefined && req.query.tenant_id !== '') {
      where.tenant_id = String(req.query.tenant_id);
    }

    const tenantOrder =
      req.user.tenant_id != null && req.user.tenant_id !== ''
        ? [
            [
              db.sequelize.literal(
                `CASE WHEN "User"."tenant_id"::text = ${db.sequelize.escape(
                  String(req.user.tenant_id)
                )} THEN 0 ELSE 1 END`
              ),
              'ASC',
            ],
          ]
        : [];

    const { count, rows } = await db.User.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash'] },
      order: [...tenantOrder, ['first_name', 'ASC'], ['last_name', 'ASC']],
      limit,
      offset,
    });

    const users = await Promise.all(
      rows.map(async (u) => {
        const shaped = searchUserPublicShape(u);
        return shaped;
      }),
    );

    const identityMap = await loadAcademicIdentityForUsers(rows);
    const tenantMap = await loadTenantNameMap(rows.map((u) => u.tenant_id));

    for (let i = 0; i < rows.length; i += 1) {
      const u = rows[i];
      const shaped = users[i];
      const identity = identityMap.get(String(u.id));
      if (identity?.academic_identity) {
        shaped.academic_identity = identity.academic_identity;
        shaped.headline = identity.academic_identity;
      }
      if (identity?.professional_identity) {
        shaped.professional_identity = identity.professional_identity;
      }
      if (identity?.company) shaped.company = identity.company;
      if (identity?.position) shaped.position = identity.position;
      const tid = u.tenant_id ? String(u.tenant_id) : null;
      if (tid && tenantMap.has(tid)) {
        shaped.college_name = tenantMap.get(tid).name;
      }
    }

    return res.status(200).json({
      status: true,
      data: {
        users,
        pagination: {
          total: count,
          page,
          pages: Math.ceil(count / limit) || 1,
          limit,
        },
      },
    });
  } catch (e) {
    console.error('searchUsers', e);
    return res.status(500).json({ status: false, message: e.message });
  }
};

exports.getUserStatsMe = async (req, res) => {
  try {
    const { resolvePortalAccessForAccount } = require('../utils/portalAccess');
    const { access } = await resolvePortalAccessForAccount({
      email: req.user?.email,
      user_type: req.user?.user_type,
      tenant_id: req.user?.tenant_id,
      portal_access: req.user?.portal_access,
      user_id: req.user?.id,
    });
    if (access === 'none') {
      return res.status(403).json({
        status: false,
        message: 'User directory statistics are restricted to administrators.',
      });
    }

    const tenantWhere =
      access === 'college' && req.user?.tenant_id
        ? { tenant_id: String(req.user.tenant_id) }
        : {};

    const total_users = await db.User.count({ where: tenantWhere });
    const students = await db.User.count({
      where: { user_type: 'student', ...tenantWhere },
    });
    const teachers = await db.User.count({
      where: { user_type: 'teacher', ...tenantWhere },
    });
    const alumni = await db.User.count({
      where: { user_type: 'alumni', ...tenantWhere },
    });
    return res.status(200).json({
      status: true,
      data: {
        total_users,
        users_by_role: { student: students, teacher: teachers, alumni },
        users_by_tenant: {},
        active_users: total_users,
        new_users_this_month: 0,
      },
    });
  } catch (e) {
    return res.status(500).json({ status: false, message: e.message });
  }
};

exports.userPosts = (req, res) => postController.getProfilePosts(req, res);

exports.blockedUsers = (req, res) => {
  return res.status(200).json({ status: true, data: [] });
};

/** Used by profile section CRUD to rebuild the same payload as GET /users/profile */
exports.buildProfilePayload = buildProfilePayload;
