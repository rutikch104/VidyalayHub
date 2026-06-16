const { Op } = require('sequelize');
const db = require('../database/index');
const { loadAcademicIdentityForUsers } = require('./academicIdentity');

const NETWORK_USER_ATTRS = [
  'id',
  'first_name',
  'last_name',
  'profile_picture',
  'user_type',
  'tenant_id',
  'bio',
  'location',
  'updated_at',
  'app_settings',
];

function getPrivacySettings(user) {
  const app = user?.app_settings && typeof user.app_settings === 'object' ? user.app_settings : {};
  return {
    allow_connection_requests: app.privacy_settings?.allow_connection_requests !== false,
    show_online_status: app.privacy_settings?.show_online_status !== false,
    ...(app.privacy_settings || {}),
  };
}

function derivePresenceStatus(user, viewerShowsOnline = true) {
  if (!viewerShowsOnline) return 'offline';
  const privacy = getPrivacySettings(user);
  if (!privacy.show_online_status) return 'offline';
  const updated = user.updated_at ? new Date(user.updated_at) : null;
  if (!updated) return 'offline';
  const mins = (Date.now() - updated.getTime()) / 60000;
  if (mins <= 5) return 'online';
  if (mins <= 30) return 'away';
  if (mins <= 1440) return 'busy';
  return 'offline';
}

async function getBlockedUserIds(userId) {
  const blocks = await db.UserBlock.findAll({
    where: {
      [Op.or]: [{ blocker_id: userId }, { blocked_user_id: userId }],
    },
    attributes: ['blocker_id', 'blocked_user_id'],
  });
  const ids = new Set();
  for (const b of blocks) {
    ids.add(String(b.blocker_id) === String(userId) ? b.blocked_user_id : b.blocker_id);
  }
  return ids;
}

async function isBlockedBetween(userIdA, userIdB) {
  const block = await db.UserBlock.findOne({
    where: {
      [Op.or]: [
        { blocker_id: userIdA, blocked_user_id: userIdB },
        { blocker_id: userIdB, blocked_user_id: userIdA },
      ],
    },
    attributes: ['id'],
  });
  return Boolean(block);
}

async function getAcceptedConnectionPeerIds(userId) {
  const rows = await db.Connection.findAll({
    where: {
      status: 'accepted',
      [Op.or]: [{ sender_id: userId }, { receiver_id: userId }],
    },
    attributes: ['sender_id', 'receiver_id'],
  });
  const peers = new Set();
  for (const r of rows) {
    peers.add(String(r.sender_id) === String(userId) ? r.receiver_id : r.sender_id);
  }
  return peers;
}

async function computeMutualConnectionCount(userIdA, userIdB) {
  const [peersA, peersB] = await Promise.all([
    getAcceptedConnectionPeerIds(userIdA),
    getAcceptedConnectionPeerIds(userIdB),
  ]);
  let count = 0;
  for (const id of peersA) {
    if (peersB.has(String(id))) count += 1;
  }
  return count;
}

async function computeMutualCountsBatch(viewerId, targetUserIds) {
  const viewerPeers = await getAcceptedConnectionPeerIds(viewerId);
  const uniqueTargets = [...new Set(targetUserIds.map(String))].filter((id) => id !== String(viewerId));
  if (!uniqueTargets.length) return new Map();

  const targetConnections = await db.Connection.findAll({
    where: {
      status: 'accepted',
      [Op.or]: [
        { sender_id: { [Op.in]: uniqueTargets } },
        { receiver_id: { [Op.in]: uniqueTargets } },
      ],
    },
    attributes: ['sender_id', 'receiver_id'],
  });

  const peersByTarget = new Map();
  for (const tid of uniqueTargets) peersByTarget.set(tid, new Set());
  for (const row of targetConnections) {
    const sid = String(row.sender_id);
    const rid = String(row.receiver_id);
    if (peersByTarget.has(sid)) peersByTarget.get(sid).add(rid);
    if (peersByTarget.has(rid)) peersByTarget.get(rid).add(sid);
  }

  const result = new Map();
  for (const tid of uniqueTargets) {
    const targetPeers = peersByTarget.get(tid) || new Set();
    let mutual = 0;
    for (const p of viewerPeers) {
      if (targetPeers.has(String(p))) mutual += 1;
    }
    result.set(tid, mutual);
  }
  return result;
}

async function loadTenantNameMap(tenantIds) {
  const ids = [...new Set(tenantIds.filter(Boolean).map(String))];
  if (!ids.length) return new Map();
  const tenants = await db.Tenant.findAll({
    where: { tenant_id: { [Op.in]: ids } },
    attributes: ['tenant_id', 'name', 'slug'],
  });
  const map = new Map();
  for (const t of tenants) {
    const j = t.toJSON ? t.toJSON() : t;
    map.set(String(j.tenant_id), { name: j.name, slug: j.slug });
  }
  return map;
}

async function loadSkillsForUsers(userIds) {
  const ids = [...new Set(userIds.filter(Boolean).map(String))];
  if (!ids.length) return new Map();
  const skills = await db.UserSkill.findAll({
    where: { user_id: { [Op.in]: ids } },
    attributes: ['user_id', 'skill_name'],
    order: [['sort_order', 'ASC']],
    limit: Math.min(500, ids.length * 8),
  });
  const map = new Map();
  for (const s of skills) {
    const uid = String(s.user_id);
    if (!map.has(uid)) map.set(uid, []);
    const arr = map.get(uid);
    if (arr.length < 5) arr.push(s.skill_name);
  }
  return map;
}

async function loadHeadlineForUsers(users) {
  const identityMap = await loadAcademicIdentityForUsers(users);
  const headlines = new Map();
  for (const [userId, fields] of identityMap.entries()) {
    if (fields?.academic_identity) headlines.set(userId, fields.academic_identity);
  }
  return headlines;
}

function baseNetworkUserShape(user, extras = {}) {
  const j = user.toJSON ? user.toJSON() : user;
  return {
    id: j.id,
    first_name: j.first_name,
    last_name: j.last_name,
    profile_picture: j.profile_picture,
    user_type: j.user_type,
    tenant_id: j.tenant_id,
    bio: j.bio || null,
    location: j.location || null,
    full_name: `${j.first_name || ''} ${j.last_name || ''}`.trim() || 'User',
    ...extras,
  };
}

async function enrichUsersForNetwork(viewerId, users, options = {}) {
  const list = users.map((u) => (u.toJSON ? u.toJSON() : u));
  const ids = list.map((u) => u.id);
  const tenantIds = list.map((u) => u.tenant_id);
  const [tenantMap, skillsMap, mutualMap, identityMap, followingSet] = await Promise.all([
    loadTenantNameMap(tenantIds),
    loadSkillsForUsers(ids),
    options.includeMutual !== false ? computeMutualCountsBatch(viewerId, ids) : Promise.resolve(new Map()),
    loadAcademicIdentityForUsers(users),
    options.includeFollow !== false ? loadFollowingSet(viewerId, ids) : Promise.resolve(new Set()),
  ]);

  return list.map((u) => {
    const tid = u.tenant_id ? String(u.tenant_id) : null;
    const college = tid && tenantMap.has(tid) ? tenantMap.get(tid).name : null;
    const identity = identityMap.get(String(u.id));
    return baseNetworkUserShape(u, {
      college_name: college,
      headline: identity?.academic_identity || null,
      academic_identity: identity?.academic_identity || null,
      professional_identity: identity?.professional_identity || null,
      company: identity?.company || null,
      position: identity?.position || null,
      degree: identity?.degree || null,
      branch: identity?.branch || null,
      academic_year: identity?.academic_year || null,
      graduation_batch: identity?.graduation_batch || null,
      designation: identity?.designation || null,
      department: identity?.department || null,
      skills: skillsMap.get(String(u.id)) || [],
      mutual_connections: mutualMap.get(String(u.id)) || 0,
      presence_status: derivePresenceStatus(u, true),
      is_following: followingSet.has(String(u.id)),
    });
  });
}

async function loadFollowingSet(viewerId, targetIds) {
  if (!targetIds.length) return new Set();
  const rows = await db.UserFollow.findAll({
    where: {
      follower_id: viewerId,
      following_id: { [Op.in]: targetIds },
    },
    attributes: ['following_id'],
  });
  return new Set(rows.map((r) => String(r.following_id)));
}

module.exports = {
  NETWORK_USER_ATTRS,
  getPrivacySettings,
  derivePresenceStatus,
  getBlockedUserIds,
  isBlockedBetween,
  getAcceptedConnectionPeerIds,
  computeMutualConnectionCount,
  computeMutualCountsBatch,
  loadTenantNameMap,
  loadSkillsForUsers,
  enrichUsersForNetwork,
  baseNetworkUserShape,
  loadFollowingSet,
};
