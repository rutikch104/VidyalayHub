const {
  resolvePortalAccessForAccount,
  isDevPortalOpenBypass,
} = require('../utils/portalAccess');

/**
 * Sets req.adminTenantFilter and req.adminPortalAccess.
 */
async function adminPortalScope(req, res, next) {
  try {
    let { access, tenant_id: resolvedTenantId } = await resolvePortalAccessForAccount({
      email: req.user?.email,
      user_type: req.user?.user_type,
      tenant_id: req.user?.tenant_id,
      portal_access: req.user?.portal_access,
      user_id: req.user?.id,
    });

    if (access === 'none' && isDevPortalOpenBypass()) {
      access = 'platform';
    }

    if (access === 'none') {
      return res.status(403).json({
        status: false,
        message:
          'Admin portal access denied. Your account must be a college staff user or a registered college administrator for this institution.',
      });
    }

    req.adminPortalAccess = access;
    req.user.portal_access = access;

    if (access === 'college') {
      const filterTenant = resolvedTenantId || req.user?.tenant_id;
      if (!filterTenant) {
        return res.status(403).json({
          status: false,
          message:
            'College admin access requires an institution assignment. Contact support to link your account to your college.',
        });
      }
      req.adminTenantFilter = String(filterTenant);
      req.user.tenant_id = String(filterTenant);
      return next();
    }

    req.adminTenantFilter = null;
    return next();
  } catch (err) {
    console.error('adminPortalScope', err);
    return res.status(500).json({
      status: false,
      message: 'Could not verify admin access.',
    });
  }
}

module.exports = { adminPortalScope };
