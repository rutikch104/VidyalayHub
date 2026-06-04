const { authenticate } = require('./auth');
const { requireSuperAdminAccess } = require('./superAdminAccess');
const { resolvePortalAccess, isDevPortalOpenBypass } = require('../utils/portalAccess');

/**
 * Requires any admin portal access (college staff or platform admin email).
 */
function requireAdminPortalAccess(req, res, next) {
  const access = resolvePortalAccess({
    email: req.user?.email,
    user_type: req.user?.user_type,
    tenant_id: req.user?.tenant_id,
    portal_access: req.user?.portal_access,
  });

  if (access !== 'none') {
    req.portalAccess = access;
    return next();
  }

  if (isDevPortalOpenBypass()) {
    req.portalAccess = 'platform';
    return next();
  }

  return res.status(403).json({
    status: false,
    message: 'Admin access denied. College administrators must use a staff account for your institution.',
  });
}

/** Chain: authenticate → requireAdminPortalAccess */
const authenticateAdminPortal = [authenticate, requireAdminPortalAccess];

/** Chain: authenticate → super-admin gate */
const authenticateSuperAdmin = [authenticate, requireSuperAdminAccess];

/** Requires platform-wide admin (not college-scoped staff). */
function requirePlatformAdminPortal(req, res, next) {
  if (req.adminPortalAccess === 'platform') {
    return next();
  }
  return res.status(403).json({
    status: false,
    message: 'Platform administrator access required for this action.',
  });
}

module.exports = {
  requireAdminPortalAccess,
  requirePlatformAdminPortal,
  authenticateAdminPortal,
  authenticateSuperAdmin,
};
