const { normalizeTenantId, isPlatformUser } = require('./tenantScope');

/** Library Central: public resources are visible across all colleges/tenants. */
function userCanAccessLibraryResource(user, resource) {
  if (!resource) return false;
  if (user?.is_admin || isPlatformUser(user)) return true;
  if (resource.uploaded_by && String(resource.uploaded_by) === String(user?.id)) return true;

  if (!resource.is_public) {
    const viewer = normalizeTenantId(user?.tenant_id);
    const ownerCollege = normalizeTenantId(resource.tenant_id);
    return Boolean(viewer && ownerCollege && viewer === ownerCollege);
  }

  const role = user?.role || user?.user_type || 'student';
  const roles = resource.allowed_roles;
  if (!roles || roles.length === 0) return true;
  return roles.includes(role);
}

/** Sequelize where fragment for listing global public library + own uploads. */
function buildLibraryListAccessWhere(user, Op) {
  if (user?.is_admin || isPlatformUser(user)) return null;

  const role = user?.role || user?.user_type || 'student';
  const globalPublic = {
    [Op.and]: [
      { is_public: true },
      {
        [Op.or]: [
          { allowed_roles: null },
          { allowed_roles: { [Op.eq]: [] } },
          { allowed_roles: { [Op.contains]: [role] } },
        ],
      },
    ],
  };

  return {
    [Op.or]: [globalPublic, { uploaded_by: user.id }],
  };
}

module.exports = {
  userCanAccessLibraryResource,
  buildLibraryListAccessWhere,
};
