const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validate: isUuid } = require('uuid');
const db = require('../database/index');
const { resolveMediaUrl } = require('../utils/resolveMediaUrl');
const { enrichUserWithTenantBranding } = require('../utils/tenantBranding');
const { resolvePortalAccessForAccount } = require('../utils/portalAccess');

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
    const {
      email,
      password,
      first_name,
      last_name,
      user_type = 'student',
      tenant_id: tenantIdBody,
      gender,
      dob,
      phone_number,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: false,
        message: 'Email and password are required.',
      });
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

    const existing = await db.User.findOne({ where: { email: String(email).toLowerCase().trim() } });
    if (existing) {
      return res.status(409).json({
        status: false,
        message: 'An account with this email already exists.',
      });
    }

    const password_hash = await bcrypt.hash(String(password), 10);

    const defaultRole = await db.Role.findOne({ where: { name: 'USER' }, attributes: ['id'] });
    const transaction = await db.sequelize.transaction();
    let user;
    try {
      user = await db.User.create(
        {
          tenant_id,
          user_type,
          first_name,
          last_name,
          gender: gender || null,
          dob: dob || null,
          email: String(email).toLowerCase().trim(),
          role_id: defaultRole?.id || null,
          phone_number: phone_number || null,
          password_hash,
          is_approved: !needsCollegeApproval,
          password_changed_at: new Date(),
        },
        { transaction }
      );

      if (user_type === 'student') {
        await db.StudentDetail.create({ user_id: user.id }, { transaction });
      } else if (user_type === 'teacher') {
        await db.TeacherDetail.create({ user_id: user.id }, { transaction });
      } else if (user_type === 'alumni') {
        await db.AlumniDetail.create({ user_id: user.id }, { transaction });
      }

      await transaction.commit();
    } catch (createErr) {
      await transaction.rollback();
      throw createErr;
    }

    const userWithRole = await db.User.findByPk(user.id, {
      include: [{ model: db.Role, as: 'roleRef', attributes: ['id', 'name'] }],
    });

    if (needsCollegeApproval) {
      return res.status(201).json({
        status: true,
        data: {
          pending_approval: true,
          message:
            'Registration submitted. Sign in after your college administrator approves your account in the admin portal.',
          user: publicUser(userWithRole || user),
        },
      });
    }

    const token = await signToken(userWithRole || user);

    return res.status(201).json({
      status: true,
      data: {
        token,
        user: publicUser(userWithRole || user),
      },
    });
  } catch (err) {
    console.error('register error:', err);
    const msg =
      err && err.name === 'SequelizeUniqueConstraintError'
        ? 'An account with this email already exists.'
        : err.message || 'Registration failed.';
    return res.status(500).json({
      status: false,
      message: msg,
    });
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
      return res.status(403).json({
        status: false,
        message:
          'Your account is pending approval from your college administrator. You can sign in after they activate your account.',
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
