const jwt = require('jsonwebtoken');
const { resolvePortalAccess, normalizeUserType } = require('../utils/portalAccess');
const { getJwtSecret } = require('../utils/jwtSecret');
const { assertTenantAccess } = require('./tenant');
const { tenantRlsMiddleware } = require('./tenantRls');

function normalizeTenantId(raw) {
  if (raw == null || String(raw).trim() === '') return null;
  return raw;
}

module.exports.authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: false, message: 'Unauthorized: Missing bearer token.' });
    }

    const token = authHeader.split(' ')[1];

    let payload;
    try {
      payload = jwt.verify(token, getJwtSecret());
    } catch (err) {
      return res.status(401).json({ status: false, message: 'Unauthorized: Invalid token.' });
    }

    // Normalize user object expected by controllers
    const firstName = payload.first_name || payload.FirstName || (payload.Name ? String(payload.Name).split(' ')[0] : undefined);
    const lastName = payload.last_name || payload.LastName || (payload.Name ? String(payload.Name).split(' ').slice(1).join(' ') : undefined);

    const role = payload.role_name || payload.role || payload.user_type;
    const userType = normalizeUserType(payload.user_type || payload.role || 'student');
    const tenant_id = normalizeTenantId(payload.tenant_id);
    const email = payload.email || payload.Email;
    const portal_access =
      payload.portal_access === 'college' || payload.portal_access === 'platform'
        ? payload.portal_access
        : resolvePortalAccess({
            email,
            user_type: userType,
            tenant_id,
            portal_access: payload.portal_access,
          });

    req.user = {
      id: payload.id || payload.Id || payload.user_id,
      email,
      name: payload.Name || [firstName, lastName].filter(Boolean).join(' ') || undefined,
      first_name: firstName,
      last_name: lastName,
      role,
      role_id: payload.role_id || null,
      role_name: payload.role_name || null,
      user_type: userType,
      tenant_id,
      tenant_slug: payload.tenant_slug || null,
      portal_access,
      is_institution_admin: Boolean(payload.is_institution_admin) || portal_access === 'college',
      super_admin_owner: Boolean(payload.super_admin_owner),
      is_admin:
        Boolean(payload.is_admin) ||
        role === 'main_admin' ||
        role === 'super_admin' ||
        portal_access !== 'none',
    };

    return assertTenantAccess(req, res, () => tenantRlsMiddleware(req, res, next));
  } catch (err) {
    return res.status(500).json({ status: false, message: 'Internal server error during authentication.' });
  }
};

/** @deprecated Use adminPortalScope or requireSuperAdminAccess */
module.exports.verifyAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ status: false, message: 'Unauthorized.' });
    }
    if (req.user.portal_access && req.user.portal_access !== 'none') {
      return next();
    }
    return res.status(403).json({ status: false, message: 'Access denied. Admins only.' });
  } catch (err) {
    return res.status(500).json({ status: false, message: 'Internal server error.' });
  }
};