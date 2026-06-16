const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validate: isUuid } = require('uuid');
const db = require('../database/index');
const { resolveMediaUrl } = require('../utils/resolveMediaUrl');
const { enrichUserWithTenantBranding } = require('../utils/tenantBranding');
const { resolvePortalAccessForAccount } = require('../utils/portalAccess');
const {
  createCampusRegistration,
  getRegistrationStatusByEmail,
  registrationStatusLabel,
} = require('../services/campusRegistrationService');

const { getJwtSecret } = require('../utils/jwtSecret');

function publicUser(record) {
  const u = record.toJSON ? record.toJSON() : { ...record };
  delete u.password_hash;
  return {
    id: String(u.id),
    email: u.email,
    name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email,
    first_name: u.first_name || '',
    last_name: u.last_name || '',
    role: u.user_type,
    role_id: u.role_id || u.roleRef?.id || null,
    role_name: u.roleRef?.name || null,
    user_type: u.user_type,
    tenant_id: u.tenant_id != null ? String(u.tenant_id) : '',
    avatar_url: u.profile_picture ? resolveMediaUrl(u.profile_picture) : undefined,
    is_approved: Boolean(u.is_approved),
  };
}

async function publicUserWithTenant(record) {
  const base = publicUser(record);
  return enrichUserWithTenantBranding(base);
}

async function resolveTenantId(raw) {
  if (raw != null && raw !== '' && isUuid(String(raw))) {
    const t = await db.Tenant.findByPk(String(raw));
    if (t) return t.tenant_id;
  }
  const preferred = await db.Tenant.findOne({
    where: { status: 'approved' },
    order: [['created_at', 'ASC']],
  });
  if (preferred) return preferred.tenant_id;
  const any = await db.Tenant.findOne({ order: [['created_at', 'ASC']] });
  if (any) return any.tenant_id;
  // Fresh DBs often have no tenants yet — self-serve signup would always fail without this.
  const created = await db.Tenant.create({
    name: 'Default institution',
    type: 'University',
    status: 'approved',
  });
  console.info(`[auth] Created default tenant ${created.tenant_id} (no tenants existed).`);
  return created.tenant_id;
}

/**
 * Self-serve signup: tenant_id required and must reference an approved college.
 * Set AUTH_AUTO_APPROVE_REGISTRATIONS=true to restore legacy behaviour (optional tenant, auto-approved users).
 */
async function resolveTenantIdForRegister(tenantIdBody) {
  const legacy = String(process.env.AUTH_AUTO_APPROVE_REGISTRATIONS || '').toLowerCase() === 'true';
  if (legacy && (tenantIdBody == null || String(tenantIdBody).trim() === '')) {
    return resolveTenantId(null);
  }
  if (tenantIdBody == null || String(tenantIdBody).trim() === '') {
    const e = new Error('Please select your college / institution from the list.');
    e.statusCode = 400;
    throw e;
  }
  if (!isUuid(String(tenantIdBody).trim())) {
    const e = new Error('Invalid college selection.');
    e.statusCode = 400;
    throw e;
  }
  const t = await db.Tenant.findByPk(String(tenantIdBody).trim());
  if (!t) {
    const e = new Error('College not found.');
    e.statusCode = 400;
    throw e;
  }
  if (t.status !== 'approved') {
    const e = new Error('This college is not open for registration yet.');
    e.statusCode = 400;
    throw e;
  }
  return t.tenant_id;
}

async function signToken(user) {
  const u = user.toJSON ? user.toJSON() : user;
  const portalMeta = await resolvePortalAccessForAccount({
    email: u.email,
    user_type: u.user_type,
    tenant_id: u.tenant_id,
    user_id: u.id,
  });
  const tenant_id =
    portalMeta.tenant_id ||
    (u.tenant_id != null ? String(u.tenant_id) : null);
  let tenant_slug = null;
  if (tenant_id) {
    const t = await db.Tenant.findByPk(tenant_id, { attributes: ['slug', 'name'] });
    tenant_slug = t?.slug || null;
  }
  return jwt.sign(
    {
      id: String(u.id),
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      tenant_id,
      tenant_slug,
      user_type: u.user_type,
      role: u.user_type,
      role_id: u.role_id || null,
      role_name: u.roleRef?.name || null,
      portal_access: portalMeta.access,
      is_institution_admin: portalMeta.is_institution_admin,
    },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

exports.register = async (req, res) => {
  try {
    const body = req.body || {};
    const {
      tenant_id: tenantIdBody,
      user_type = 'student',
      first_name,
      last_name,
      full_name,
    } = body;

    if (!body.email || !body.password) {
      return res.status(400).json({
        status: false,
        message: 'Email and password are required.',
      });
    }

    if (!first_name && full_name) {
      const parts = String(full_name).trim().split(/\s+/).filter(Boolean);
      body.first_name = parts[0] || '';
      body.last_name = parts.slice(1).join(' ') || '';
    }

    let tenant_id;
    try {
      tenant_id = await resolveTenantIdForRegister(tenantIdBody);
    } catch (tenantErr) {
      const code = tenantErr.statusCode && Number(tenantErr.statusCode) >= 400 ? tenantErr.statusCode : 500;
      if (code >= 500) console.error('resolveTenantIdForRegister error:', tenantErr);
      return res.status(code).json({
        status: false,
        message: tenantErr.message || 'Could not resolve institution.',
      });
    }

    const legacyAuto = String(process.env.AUTH_AUTO_APPROVE_REGISTRATIONS || '').toLowerCase() === 'true';
    const utLower = String(user_type || 'student').toLowerCase();
    const needsCollegeApproval =
      !legacyAuto && ['student', 'teacher', 'alumni'].includes(utLower);

    const userWithRole = await createCampusRegistration({
      body: { ...body, user_type: utLower, tenant_id },
      files: req.files,
      tenantId: tenant_id,
      needsCollegeApproval,
    });

    if (needsCollegeApproval) {
      return res.status(201).json({
        status: true,
        data: {
          pending_approval: true,
          registration_status: userWithRole.registration_status,
          registration_status_label: registrationStatusLabel(userWithRole.registration_status),
          message:
            'Your registration has been submitted successfully and is awaiting verification by your college administration.',
          user: publicUser(userWithRole),
        },
      });
    }

    const token = await signToken(userWithRole);

    return res.status(201).json({
      status: true,
      data: {
        token,
        user: publicUser(userWithRole),
      },
    });
  } catch (err) {
    console.error('register error:', err);
    const status = err.statusCode || (err.name === 'SequelizeUniqueConstraintError' ? 409 : 500);
    const msg =
      err && err.name === 'SequelizeUniqueConstraintError'
        ? 'An account with this email already exists.'
        : err.message || 'Registration failed.';
    return res.status(status).json({
      status: false,
      message: msg,
    });
  }
};

exports.getRegistrationStatus = async (req, res) => {
  try {
    const email = req.query.email || req.body?.email;
    const data = await getRegistrationStatusByEmail(email);
    if (!data) {
      return res.status(404).json({
        status: false,
        message: 'No registration found for this email address.',
      });
    }
    return res.status(200).json({ status: true, data });
  } catch (err) {
    console.error('getRegistrationStatus error:', err);
    return res.status(500).json({ status: false, message: err.message || 'Failed to load status.' });
  }
};

exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        status: false,
        message: 'Email and password are required.',
      });
    }

    const user = await db.User.findOne({
      where: { email: String(email).toLowerCase().trim() },
      include: [{ model: db.Role, as: 'roleRef', attributes: ['id', 'name'] }],
    });

    if (!user) {
      return res.status(401).json({
        status: false,
        message: 'Invalid email or password.',
      });
    }

    const match = await bcrypt.compare(String(password), user.password_hash);
    if (!match) {
      return res.status(401).json({
        status: false,
        message: 'Invalid email or password.',
      });
    }

    const portalMeta = await resolvePortalAccessForAccount({
      email: user.email,
      user_type: user.user_type,
      tenant_id: user.tenant_id,
      user_id: user.id,
    });
    const isStaffAdmin =
      portalMeta.access === 'college' || portalMeta.access === 'platform';

    if (!user.is_approved && !isStaffAdmin) {
      const statusLabel = registrationStatusLabel(user.registration_status);
      return res.status(403).json({
        status: false,
        message:
          user.registration_status === 'rejected'
            ? `Your registration was rejected. ${user.registration_rejection_reason || 'Contact your college administration for details.'}`
            : user.registration_status === 'needs_info'
              ? `Additional information is required: ${user.registration_admin_notes || 'Please contact your college administration.'}`
              : `Your account is ${statusLabel.toLowerCase()}. Sign in after your college administrator approves your registration.`,
        registration_status: user.registration_status,
      });
    }

    const token = await signToken(user);

    return res.status(200).json({
      status: true,
      data: {
        token,
        user: await publicUserWithTenant(user),
      },
    });
  } catch (err) {
    console.error('signin error:', err);
    return res.status(500).json({
      status: false,
      message: err.message || 'Sign in failed.',
    });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id, {
      include: [{ model: db.Role, as: 'roleRef', attributes: ['id', 'name'] }],
    });
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }
    if (!user.is_approved) {
      return res.status(403).json({
        status: false,
        message: 'Account pending college administrator approval.',
      });
    }
    return res.status(200).json({
      status: true,
      data: await publicUserWithTenant(user),
    });
  } catch (err) {
    console.error('me error:', err);
    return res.status(500).json({
      status: false,
      message: err.message || 'Failed to load user.',
    });
  }
};

exports.logout = async (req, res) => {
  return res.status(200).json({ status: true, message: 'Logged out.' });
};
