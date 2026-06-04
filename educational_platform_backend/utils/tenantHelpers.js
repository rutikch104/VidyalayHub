const { Op } = require('sequelize');
const db = require('../database/index');
const {
  assertSameTenant,
  isPlatformUser,
  normalizeTenantId,
  denyIfCrossTenant,
  mergeTenantWhere,
  FACULTY_TYPES,
  canAccessCommunity,
} = require('./tenantScope');

function normalizeConnectionScope(raw) {
  const s = String(raw || 'college').toLowerCase().trim();
  return s === 'global' ? 'global' : 'college';
}

async function loadUserTenant(userId) {
  if (!userId) return null;
  return db.User.findByPk(userId, { attributes: ['id', 'tenant_id', 'user_type'] });
}

async function resolveUserTenantId(userId) {
  const u = await loadUserTenant(userId);
  return u?.tenant_id != null ? String(u.tenant_id) : null;
}

/**
 * Peer rules for connections / DMs.
 * @param {{ scope?: 'college'|'global' }} options
 * @returns {{ ok: true } | { ok: false, status: number, message: string }}
 */
async function assertPeerConnection(req, userIdA, userIdB, options = {}) {
  if (isPlatformUser(req.user)) return { ok: true };

  const scope = normalizeConnectionScope(options.scope);
  const [a, b] = await Promise.all([loadUserTenant(userIdA), loadUserTenant(userIdB)]);
  if (!a || !b) {
    return { ok: false, status: 404, message: 'User not found.' };
  }

  if (scope === 'global') {
    return { ok: true };
  }

  if (a.tenant_id && b.tenant_id && !assertSameTenant(a.tenant_id, b.tenant_id)) {
    return {
      ok: false,
      status: 403,
      message: 'This action is limited to members of your institution.',
    };
  }

  return { ok: true };
}

/** @deprecated alias — use assertPeerConnection with scope college */
async function assertCollegePeerUsers(req, userIdA, userIdB) {
  return assertPeerConnection(req, userIdA, userIdB, { scope: 'college' });
}

/**
 * Direct messages: same college, or accepted global faculty connection, or explicit global scope.
 */
async function assertDirectMessagePeers(req, userIdA, userIdB, options = {}) {
  const scope = normalizeConnectionScope(options.scope);
  if (scope === 'global') {
    return assertPeerConnection(req, userIdA, userIdB, { scope: 'global' });
  }

  const collegeCheck = await assertPeerConnection(req, userIdA, userIdB, { scope: 'college' });
  if (collegeCheck.ok) return collegeCheck;

  const globalConn = await db.Connection.findOne({
    where: {
      status: 'accepted',
      scope: 'global',
      [Op.or]: [
        { sender_id: userIdA, receiver_id: userIdB },
        { sender_id: userIdB, receiver_id: userIdA },
      ],
    },
    attributes: ['id'],
  });
  if (globalConn) return { ok: true };

  return collegeCheck;
}

function tenantIdForCreate(req) {
  return normalizeTenantId(req.user?.tenant_id || req.tenant?.id);
}

/**
 * Ensure bookmark target exists and is accessible in the user's college context.
 * @returns {{ ok: true } | { ok: false, status: number, message: string }}
 */
async function assertBookmarkableItem(req, type, typeId) {
  if (isPlatformUser(req.user)) return { ok: true };

  switch (type) {
    case 'post': {
      const post = await db.Post.findOne({
        where: mergeTenantWhere({ id: typeId }, req.user),
        attributes: ['id', 'tenant_id'],
      });
      if (!post) return { ok: false, status: 404, message: 'post not found.' };
      const denial = denyIfCrossTenant(req, post.tenant_id);
      if (denial) return { ok: false, status: denial.status, message: denial.message };
      return { ok: true };
    }
    case 'event': {
      const event = await db.Event.findByPk(typeId, {
        attributes: ['id', 'tenant_id', 'visibility', 'created_by'],
      });
      if (!event) return { ok: false, status: 404, message: 'event not found.' };
      if (event.visibility === 'global' || String(event.created_by) === String(req.user.id)) {
        return { ok: true };
      }
      const denial = denyIfCrossTenant(req, event.tenant_id);
      if (denial) return { ok: false, status: denial.status, message: denial.message };
      return { ok: true };
    }
    case 'resource': {
      const { userCanAccessLibraryResource } = require('./libraryAccess');
      const resource = await db.ResourceLibrary.findByPk(typeId, {
        attributes: ['id', 'tenant_id', 'is_public', 'allowed_roles', 'uploaded_by'],
      });
      if (!resource) return { ok: false, status: 404, message: 'resource not found.' };
      if (!userCanAccessLibraryResource(req.user, resource)) {
        return { ok: false, status: 403, message: 'Access denied to this resource.' };
      }
      return { ok: true };
    }
    case 'job': {
      const job = await db.JobPost.findByPk(typeId, {
        attributes: ['id', 'tenant_id', 'posted_by', 'visibility', 'is_active'],
      });
      if (!job || !job.is_active) {
        return { ok: false, status: 404, message: 'job not found.' };
      }
      if (String(job.posted_by) === String(req.user.id)) return { ok: true };
      if (job.visibility === 'global') return { ok: true };
      const denial = denyIfCrossTenant(req, job.tenant_id);
      if (denial) return { ok: false, status: denial.status, message: denial.message };
      return { ok: true };
    }
    case 'community_post': {
      const cp = await db.CommunityPost.findOne({
        where: { id: typeId, is_deleted: false },
        include: [
          {
            model: db.Community,
            as: 'community',
            attributes: ['id', 'tenant_id', 'is_private', 'is_active'],
          },
        ],
      });
      if (!cp || !cp.community || !cp.community.is_active) {
        return { ok: false, status: 404, message: 'community post not found.' };
      }
      if (!canAccessCommunity(req.user, cp.community)) {
        return { ok: false, status: 403, message: 'Access denied to this community.' };
      }
      if (cp.community.is_private) {
        const mem = await db.CommunityMember.findOne({
          where: {
            community_id: cp.community_id,
            user_id: req.user.id,
            is_active: true,
          },
        });
        if (!mem) {
          return {
            ok: false,
            status: 403,
            message: 'Join this community to bookmark posts.',
          };
        }
      }
      return { ok: true };
    }
    default:
      return { ok: true };
  }
}

module.exports = {
  loadUserTenant,
  resolveUserTenantId,
  normalizeConnectionScope,
  assertPeerConnection,
  assertCollegePeerUsers,
  assertDirectMessagePeers,
  tenantIdForCreate,
  assertBookmarkableItem,
};
