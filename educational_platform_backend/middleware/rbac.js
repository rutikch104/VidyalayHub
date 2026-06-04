const db = require('../database/index');

async function getUserRoleContext(userId) {
  return db.User.findByPk(userId, {
    attributes: ['id', 'email', 'role_id', 'user_type'],
    include: [
      {
        model: db.Role,
        as: 'roleRef',
        attributes: ['id', 'name', 'description'],
        include: [{ model: db.Permission, as: 'permissions', attributes: ['id', 'resource', 'action', 'key'] }],
      },
    ],
  });
}

async function hydrateRbac(req, res, next) {
  try {
    if (req.user?.super_admin_owner === true) {
      const allPermissions = await db.Permission.findAll({ attributes: ['key'] });
      req.rbac = {
        role: { id: 'super_admin_owner', name: 'SUPER_ADMIN', description: 'Owner from super_admins table' },
        permissionKeys: new Set(allPermissions.map((p) => p.key)),
      };
      return next();
    }
    if (!req.user?.id) return res.status(401).json({ status: false, message: 'Authentication required.' });
    const u = await getUserRoleContext(req.user.id);
    if (!u) return res.status(401).json({ status: false, message: 'Invalid user session.' });
    const j = u.toJSON();
    req.rbac = {
      role: j.roleRef || null,
      permissionKeys: new Set((j.roleRef?.permissions || []).map((p) => p.key)),
    };
    return next();
  } catch (err) {
    return res.status(500).json({ status: false, message: 'RBAC lookup failed.', error: err.message });
  }
}

function requireSuperAdminRole(req, res, next) {
  if (!req.rbac?.role || req.rbac.role.name !== 'SUPER_ADMIN') {
    return res.status(403).json({ status: false, message: 'SUPER_ADMIN role required.' });
  }
  return next();
}

function requirePermission(permissionKey) {
  return (req, res, next) => {
    if (!req.rbac?.permissionKeys?.has(permissionKey)) {
      return res.status(403).json({ status: false, message: `Permission denied: ${permissionKey}` });
    }
    return next();
  };
}

module.exports = { hydrateRbac, requireSuperAdminRole, requirePermission };
