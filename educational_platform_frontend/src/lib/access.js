/**
 * Client-side portal access (mirrors backend utils/portalAccess.js).
 */

export function normalizeUserType(user) {
  const ut = String(user?.user_type || user?.role || '').toLowerCase().trim();
  if (ut === 'college_admin') return 'staff';
  return ut;
}

/** @returns {'college'|'platform'|'none'} */
export function getPortalAccess(user) {
  if (!user) return 'none';

  const fromServer = user.portal_access;
  if (fromServer === 'college' || fromServer === 'platform') {
    return fromServer;
  }

  if (user.is_institution_admin) {
    return 'college';
  }

  const ut = normalizeUserType(user);
  if (ut === 'staff' && user.tenant_id) return 'college';
  if (ut === 'staff') return 'platform';

  return 'none';
}

export function canSeeAdminNav(user) {
  return getPortalAccess(user) !== 'none';
}

export function canAccessCollegeAdminPortal(user) {
  return getPortalAccess(user) === 'college';
}

export function canAccessPlatformAdminPortal(user) {
  return getPortalAccess(user) === 'platform';
}

export function canSeeSuperAdminNav(user) {
  if (typeof window === 'undefined') return false;
  const isSuperSession = localStorage.getItem('superAdminSession') === 'true';
  return isSuperSession && user?.role_name === 'SUPER_ADMIN';
}

export function isCollegeScopedAdmin(user) {
  return getPortalAccess(user) === 'college';
}
