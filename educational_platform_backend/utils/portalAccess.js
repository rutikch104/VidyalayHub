const db = require('../database/index');

function normalizeUserType(raw) {
  const ut = String(raw || '').toLowerCase().trim();
  if (ut === 'college_admin') return 'staff';
  return ut;
}

function getPlatformAdminEmails() {
  return String(process.env.PLATFORM_ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function isPlatformAdminEmail(email) {
  const e = String(email || '').toLowerCase().trim();
  const list = getPlatformAdminEmails();
  return list.length > 0 && list.includes(e);
}

/**
 * Synchronous portal check (JWT fast-path, no DB).
 * @returns {'college'|'platform'|'none'}
 */
function resolvePortalAccess({ email, user_type, tenant_id, portal_access }) {
  if (portal_access === 'college' || portal_access === 'platform') {
    return portal_access;
  }

  if (isPlatformAdminEmail(email)) {
    return 'platform';
  }

  const ut = normalizeUserType(user_type);
  if (ut === 'staff' && tenant_id != null && String(tenant_id).trim() !== '') {
    return 'college';
  }

  if (ut === 'staff' && !tenant_id) {
    return 'platform';
  }

  return 'none';
}

/**
 * Full account check including TenantAdmins table (college portal admins).
 * @returns {Promise<{ access: 'college'|'platform'|'none', tenant_id: string|null, is_institution_admin: boolean }>}
 */
async function resolvePortalAccessForAccount({
  email,
  user_type,
  tenant_id,
  portal_access,
  user_id,
}) {
  let tid =
    tenant_id != null && String(tenant_id).trim() !== '' ? String(tenant_id) : null;

  let access = resolvePortalAccess({
    email,
    user_type,
    tenant_id: tid,
    portal_access,
  });

  const normalizedEmail = String(email || '').toLowerCase().trim();

  if (access === 'none' && normalizedEmail) {
    const tenantAdmin = await db.TenantAdmin.findOne({
      where: { email: normalizedEmail },
      attributes: ['tenant_id'],
    });
    if (tenantAdmin) {
      access = 'college';
      tid = tid || String(tenantAdmin.tenant_id);
    }
  }

  if (access === 'college' && !tid && user_id) {
    const user = await db.User.findByPk(user_id, {
      attributes: ['tenant_id', 'user_type', 'email'],
    });
    if (user?.tenant_id) {
      tid = String(user.tenant_id);
    } else if (user?.email) {
      const tenantAdmin = await db.TenantAdmin.findOne({
        where: { email: String(user.email).toLowerCase().trim() },
        attributes: ['tenant_id'],
      });
      if (tenantAdmin) tid = String(tenantAdmin.tenant_id);
    }
  }

  return {
    access,
    tenant_id: tid,
    is_institution_admin: access === 'college',
  };
}

function isDevPortalOpenBypass() {
  return (
    process.env.NODE_ENV !== 'production' &&
    String(process.env.ADMIN_PORTAL_OPEN || '').toLowerCase() === 'true'
  );
}

module.exports = {
  normalizeUserType,
  getPlatformAdminEmails,
  isPlatformAdminEmail,
  resolvePortalAccess,
  resolvePortalAccessForAccount,
  isDevPortalOpenBypass,
};
