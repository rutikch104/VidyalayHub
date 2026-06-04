const { Op } = require('sequelize');
const { isPlatformUser, normalizeTenantId } = require('./tenantScope');

/**
 * Jobs/events with visibility college_only are limited to the viewer's tenant.
 * Global visibility is cross-tenant; own content is always visible to the author.
 */
function buildVisibilityWhere(user, { postedByField = null, createdByField = null } = {}) {
  if (isPlatformUser(user)) return {};

  const userId = user?.id;
  const tenantId = normalizeTenantId(user?.tenant_id);
  const or = [{ visibility: 'global' }];

  if (userId) {
    if (postedByField) or.push({ [postedByField]: userId });
    if (createdByField && createdByField !== postedByField) {
      or.push({ [createdByField]: userId });
    }
  }

  if (tenantId) {
    or.push({ tenant_id: tenantId, visibility: 'college_only' });
  }

  return { [Op.or]: or };
}

module.exports = { buildVisibilityWhere };
