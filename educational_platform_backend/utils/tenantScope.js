const { Op } = require('sequelize');

function normalizeTenantId(raw) {
  if (raw == null || String(raw).trim() === '') return null;
  return String(raw);
}

function isPlatformUser(user) {
  if (!user) return false;
  if (user.super_admin_owner) return true;
  if (user.portal_access === 'platform') return true;
  if (user.role === 'super_admin' || user.role === 'main_admin') return true;
  return false;
}

function shouldApplyTenantScope(user) {
  const tid = normalizeTenantId(user?.tenant_id);
  return Boolean(tid && !isPlatformUser(user));
}

/** Rows matching tenant (includes legacy NULL rows during migration). */
function tenantIdWhere(tenantId, { allowLegacyNull = true } = {}) {
  const tid = normalizeTenantId(tenantId);
  if (!tid) return {};
  if (allowLegacyNull) {
    return { [Op.or]: [{ tenant_id: tid }, { tenant_id: null }] };
  }
  return { tenant_id: tid };
}

/** @deprecated alias — use tenantIdWhere */
function tenantPostScope(tenantId, options) {
  return tenantIdWhere(tenantId, options);
}

function defaultTenantScopeOptions() {
  const strict = String(process.env.TENANT_STRICT_MODE || '').toLowerCase();
  const isStrict = strict === 'true' || strict === '1' || strict === 'yes';
  return { allowLegacyNull: !isStrict };
}

/** Sequelize where clauses often use Op.* symbol keys — Object.keys() alone is empty. */
function hasWhereConditions(where) {
  if (!where || typeof where !== 'object') return false;
  return Object.keys(where).length > 0 || Object.getOwnPropertySymbols(where).length > 0;
}

function mergeTenantWhere(where, user, options = {}) {
  if (!shouldApplyTenantScope(user)) return where || {};
  const scope = tenantIdWhere(user.tenant_id, { ...defaultTenantScopeOptions(), ...options });
  if (!hasWhereConditions(where)) return scope;
  return { [Op.and]: [where, scope] };
}

const FACULTY_TYPES = new Set(['teacher', 'staff']);

/** Connections: college tenant rows + faculty global network links involving the user. */
function mergeConnectionWhere(where, user, options = {}) {
  if (!shouldApplyTenantScope(user)) return where || {};
  const tid = normalizeTenantId(user.tenant_id);
  if (!tid) return mergeTenantWhere(where, user, options);

  const opts = { ...defaultTenantScopeOptions(), ...options };
  const collegeScope = tenantIdWhere(tid, opts);
  const orParts = [collegeScope];

  if (FACULTY_TYPES.has(user.user_type) && user.id) {
    orParts.push({
      scope: 'global',
      [Op.or]: [{ sender_id: user.id }, { receiver_id: user.id }],
    });
  }

  const connectionScope = { [Op.or]: orParts };
  if (!hasWhereConditions(where)) return connectionScope;
  return { [Op.and]: [where, connectionScope] };
}

function tenantIdFromReq(req) {
  return normalizeTenantId(req.user?.tenant_id || req.tenant?.id);
}

function assertSameTenant(viewerTenantId, resourceTenantId) {
  const v = normalizeTenantId(viewerTenantId);
  const r = normalizeTenantId(resourceTenantId);
  if (!v || !r) return true;
  return v === r;
}

/** Returns null if allowed, or { status, message } for HTTP response. */
function denyIfCrossTenant(req, resourceTenantId) {
  if (isPlatformUser(req.user)) return null;
  const viewer = tenantIdFromReq(req);
  const resource = normalizeTenantId(resourceTenantId);
  if (!viewer || !resource) return null;
  if (!assertSameTenant(viewer, resource)) {
    return {
      status: 403,
      message: 'Access denied. This resource belongs to another institution.',
    };
  }
  return null;
}

/**
 * Homepage posts feed: college members only see content from their institution.
 * Platform users return null (no extra constraint).
 * @param {object} user - req.user
 * @param {{ col?: Function, sqlWhere?: Function }} sequelize - optional for author join filter
 */
/**
 * Community discovery: public communities (all tenants) + private communities for user's college.
 */
function mergeCommunityDiscoverWhere(where, user, options = {}) {
  if (!shouldApplyTenantScope(user)) return where || {};
  const tid = normalizeTenantId(user.tenant_id);
  if (!tid) return where || {};
  const opts = { ...defaultTenantScopeOptions(), ...options };
  const visibility = {
    [Op.or]: [
      { is_private: false },
      { is_private: true, ...tenantIdWhere(tid, opts) },
    ],
  };
  if (!hasWhereConditions(where)) return visibility;
  return { [Op.and]: [where, visibility] };
}

/** Whether the user may view/join a community (public = all tenants; private = same college). */
function canAccessCommunity(user, community) {
  if (!community) return false;
  if (isPlatformUser(user)) return true;
  if (!community.is_private) return true;
  const viewer = normalizeTenantId(user?.tenant_id);
  const resource = normalizeTenantId(community.tenant_id);
  if (!viewer) return false;
  if (!resource) return true;
  return viewer === resource;
}

function buildCollegeHomeFeedWhere(user, { col, sqlWhere } = {}) {
  if (!user || isPlatformUser(user)) return null;

  const tid = normalizeTenantId(user.tenant_id);
  if (!tid) {
    return { user_id: user.id };
  }

  const strict = !defaultTenantScopeOptions().allowLegacyNull;
  const postTenantClause = strict
    ? { tenant_id: tid }
    : { [Op.or]: [{ tenant_id: tid }, { tenant_id: null }] };

  const authorSameCollege =
    col && sqlWhere
      ? sqlWhere(col('user.tenant_id'), tid)
      : { '$user.tenant_id$': tid };

  return {
    [Op.or]: [
      { user_id: user.id },
      {
        [Op.and]: [
          postTenantClause,
          authorSameCollege,
          { visibility: { [Op.in]: ['public', 'college'] } },
        ],
      },
    ],
  };
}

module.exports = {
  normalizeTenantId,
  isPlatformUser,
  shouldApplyTenantScope,
  defaultTenantScopeOptions,
  tenantIdWhere,
  tenantPostScope,
  hasWhereConditions,
  mergeTenantWhere,
  mergeConnectionWhere,
  FACULTY_TYPES,
  tenantIdFromReq,
  assertSameTenant,
  denyIfCrossTenant,
  buildCollegeHomeFeedWhere,
  mergeCommunityDiscoverWhere,
  canAccessCommunity,
};
