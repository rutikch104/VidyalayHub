/**
 * Suggested People — relationship-aware recommendation scoring.
 * Structured for future analytics / ML enhancements (profile views, engagement similarity).
 */
const { Op } = require('sequelize');
const db = require('../database/index');
const { loadAcademicIdentityForUsers } = require('../utils/academicIdentity');
const {
  getBlockedUserIds,
  enrichUsersForNetwork,
  getAcceptedConnectionPeerIds,
  loadSkillsForUsers,
  NETWORK_USER_ATTRS,
} = require('../utils/networkHelpers');

/** Tunable weights — adjust without changing scoring flow */
const SCORE_WEIGHTS = {
  SAME_COLLEGE: 35,
  OTHER_COLLEGE: 6,
  SAME_DEPARTMENT: 22,
  SAME_DEGREE: 18,
  SAME_BRANCH: 14,
  SAME_ACADEMIC_YEAR: 16,
  SAME_BATCH: 20,
  SAME_USER_TYPE: 10,
  MUTUAL_CONNECTION_EACH: 12,
  MUTUAL_CONNECTION_CAP: 48,
  MUTUAL_FOLLOWER_EACH: 8,
  MUTUAL_FOLLOWER_CAP: 32,
  SHARED_SKILL_EACH: 6,
  SHARED_SKILL_CAP: 24,
  SHARED_COMMUNITY_EACH: 10,
  SHARED_COMMUNITY_CAP: 30,
  SAME_COMPANY: 18,
  SAME_DESIGNATION: 12,
};

const INACTIVE_REGISTRATION = ['suspended', 'rejected'];
const CANDIDATE_POOL_LIMIT = 600;

function normalizeToken(value) {
  return String(value || '').trim().toLowerCase();
}

function parsePagination(query = {}) {
  const page = Math.max(1, parseInt(String(query.page), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit), 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

async function getSuggestionExclusionIds(viewerId) {
  const excludeIds = new Set([String(viewerId)]);

  const [involved, blocks] = await Promise.all([
    db.Connection.findAll({
      where: {
        status: { [Op.in]: ['pending', 'accepted'] },
        [Op.or]: [{ sender_id: viewerId }, { receiver_id: viewerId }],
      },
      attributes: ['sender_id', 'receiver_id'],
    }),
    db.UserBlock.findAll({
      where: {
        [Op.or]: [{ blocker_id: viewerId }, { blocked_user_id: viewerId }],
      },
      attributes: ['blocker_id', 'blocked_user_id'],
    }),
  ]);

  involved.forEach((c) => {
    excludeIds.add(
      String(c.sender_id) === String(viewerId) ? String(c.receiver_id) : String(c.sender_id),
    );
  });
  blocks.forEach((b) => {
    excludeIds.add(
      String(b.blocker_id) === String(viewerId)
        ? String(b.blocked_user_id)
        : String(b.blocker_id),
    );
  });

  return excludeIds;
}

async function loadViewerContext(viewerId) {
  const viewer = await db.User.findByPk(viewerId, {
    attributes: ['id', 'tenant_id', 'user_type', 'first_name', 'last_name'],
  });
  if (!viewer) return null;

  const [identityMap, skillRows, viewerPeers, viewerFollowing, viewerFollowers] = await Promise.all([
    loadAcademicIdentityForUsers([viewer]),
    db.UserSkill.findAll({
      where: { user_id: viewerId },
      attributes: ['skill_name'],
    }),
    getAcceptedConnectionPeerIds(viewerId),
    db.UserFollow.findAll({
      where: { follower_id: viewerId },
      attributes: ['following_id'],
    }),
    db.UserFollow.findAll({
      where: { following_id: viewerId },
      attributes: ['follower_id'],
    }),
  ]);

  const identity = identityMap.get(String(viewerId)) || {};
  const skills = new Set(
    skillRows.map((s) => normalizeToken(s.skill_name)).filter(Boolean),
  );
  const following = new Set(viewerFollowing.map((r) => String(r.following_id)));
  const followers = new Set(viewerFollowers.map((r) => String(r.follower_id)));

  let viewerCommunities = new Set();
  const communityRows = await db.CommunityMember.findAll({
    where: { user_id: viewerId, is_active: true },
    attributes: ['community_id'],
  });
  viewerCommunities = new Set(communityRows.map((r) => String(r.community_id)));

  return {
    user: viewer,
    tenantId: viewer.tenant_id ? String(viewer.tenant_id) : null,
    userType: viewer.user_type,
    identity,
    skills,
    peers: viewerPeers,
    following,
    followers,
    communities: viewerCommunities,
  };
}

async function loadCandidateBatchContext(candidateIds) {
  if (!candidateIds.length) {
    return {
      identityMap: new Map(),
      skillsMap: new Map(),
      peersByCandidate: new Map(),
      communitiesByCandidate: new Map(),
      followersByCandidate: new Map(),
    };
  }

  const [users, skillsMap, peerConnections, communityRows, followerRows] = await Promise.all([
    db.User.findAll({
      where: { id: { [Op.in]: candidateIds } },
      attributes: NETWORK_USER_ATTRS,
    }),
    loadSkillsForUsers(candidateIds),
    db.Connection.findAll({
      where: {
        status: 'accepted',
        [Op.or]: [
          { sender_id: { [Op.in]: candidateIds } },
          { receiver_id: { [Op.in]: candidateIds } },
        ],
      },
      attributes: ['sender_id', 'receiver_id'],
    }),
    db.CommunityMember.findAll({
      where: { user_id: { [Op.in]: candidateIds }, is_active: true },
      attributes: ['user_id', 'community_id'],
    }),
    db.UserFollow.findAll({
      where: { following_id: { [Op.in]: candidateIds } },
      attributes: ['follower_id', 'following_id'],
    }),
  ]);

  const identityMap = await loadAcademicIdentityForUsers(users);

  const peersByCandidate = new Map();
  for (const id of candidateIds) peersByCandidate.set(String(id), new Set());
  for (const row of peerConnections) {
    const sid = String(row.sender_id);
    const rid = String(row.receiver_id);
    if (peersByCandidate.has(sid)) peersByCandidate.get(sid).add(rid);
    if (peersByCandidate.has(rid)) peersByCandidate.get(rid).add(sid);
  }

  const communitiesByCandidate = new Map();
  for (const row of communityRows) {
    const uid = String(row.user_id);
    if (!communitiesByCandidate.has(uid)) communitiesByCandidate.set(uid, new Set());
    communitiesByCandidate.get(uid).add(String(row.community_id));
  }

  const followersByCandidate = new Map();
  for (const row of followerRows) {
    const uid = String(row.following_id);
    if (!followersByCandidate.has(uid)) followersByCandidate.set(uid, new Set());
    followersByCandidate.get(uid).add(String(row.follower_id));
  }

  return {
    identityMap,
    skillsMap,
    peersByCandidate,
    communitiesByCandidate,
    followersByCandidate,
  };
}

function scoreCandidate(viewerCtx, candidate, batchCtx) {
  const uid = String(candidate.id);
  const j = candidate.toJSON ? candidate.toJSON() : candidate;
  let score = 0;
  const reasons = [];

  const identity = batchCtx.identityMap.get(uid) || {};
  const candidateSkills = (batchCtx.skillsMap.get(uid) || []).map(normalizeToken);
  const theirPeers = batchCtx.peersByCandidate.get(uid) || new Set();
  const theirCommunities = batchCtx.communitiesByCandidate.get(uid) || new Set();
  const theirFollowers = batchCtx.followersByCandidate.get(uid) || new Set();

  // High priority — academic / institution alignment
  if (viewerCtx.tenantId && String(j.tenant_id) === viewerCtx.tenantId) {
    score += SCORE_WEIGHTS.SAME_COLLEGE;
    reasons.push('Same college');
  } else if (j.tenant_id) {
    score += SCORE_WEIGHTS.OTHER_COLLEGE;
  }

  const viewerDept = normalizeToken(viewerCtx.identity.department);
  const candDept = normalizeToken(identity.department);
  if (viewerDept && candDept && viewerDept === candDept) {
    score += SCORE_WEIGHTS.SAME_DEPARTMENT;
    reasons.push('Same department');
  }

  const viewerDegree = normalizeToken(viewerCtx.identity.degree);
  const candDegree = normalizeToken(identity.degree);
  if (viewerDegree && candDegree && viewerDegree === candDegree) {
    score += SCORE_WEIGHTS.SAME_DEGREE;
    reasons.push('Same degree');
  }

  const viewerBranch = normalizeToken(viewerCtx.identity.branch);
  const candBranch = normalizeToken(identity.branch);
  if (viewerBranch && candBranch && viewerBranch === candBranch) {
    score += SCORE_WEIGHTS.SAME_BRANCH;
    reasons.push('Same branch');
  }

  const viewerYear = normalizeToken(viewerCtx.identity.academic_year);
  const candYear = normalizeToken(identity.academic_year);
  if (viewerYear && candYear && viewerYear === candYear) {
    score += SCORE_WEIGHTS.SAME_ACADEMIC_YEAR;
    reasons.push('Same academic year');
  }

  const viewerBatch = normalizeToken(viewerCtx.identity.graduation_batch);
  const candBatch = normalizeToken(identity.graduation_batch);
  if (viewerBatch && candBatch && viewerBatch === candBatch) {
    score += SCORE_WEIGHTS.SAME_BATCH;
    reasons.push('Same batch');
  }

  if (viewerCtx.userType && j.user_type === viewerCtx.userType) {
    score += SCORE_WEIGHTS.SAME_USER_TYPE;
    reasons.push(`Also a ${j.user_type}`);
  }

  // Networking signals
  let mutual = 0;
  for (const p of viewerCtx.peers) {
    if (theirPeers.has(String(p))) mutual += 1;
  }
  if (mutual > 0) {
    score += Math.min(SCORE_WEIGHTS.MUTUAL_CONNECTION_CAP, mutual * SCORE_WEIGHTS.MUTUAL_CONNECTION_EACH);
    reasons.push(`${mutual} mutual connection${mutual > 1 ? 's' : ''}`);
  }

  let mutualFollowers = 0;
  for (const follower of viewerCtx.followers) {
    if (theirFollowers.has(String(follower))) mutualFollowers += 1;
  }
  if (mutualFollowers > 0) {
    score += Math.min(
      SCORE_WEIGHTS.MUTUAL_FOLLOWER_CAP,
      mutualFollowers * SCORE_WEIGHTS.MUTUAL_FOLLOWER_EACH,
    );
    reasons.push(`${mutualFollowers} mutual follower${mutualFollowers > 1 ? 's' : ''}`);
  }

  const sharedSkills = candidateSkills.filter((s) => viewerCtx.skills.has(s));
  if (sharedSkills.length) {
    score += Math.min(
      SCORE_WEIGHTS.SHARED_SKILL_CAP,
      sharedSkills.length * SCORE_WEIGHTS.SHARED_SKILL_EACH,
    );
    const label = sharedSkills.slice(0, 2).map((s) => s.replace(/\b\w/g, (c) => c.toUpperCase())).join(', ');
    reasons.push(`Shared ${label} skill${sharedSkills.length > 1 ? 's' : ''}`);
  }

  let sharedCommunities = 0;
  for (const cid of viewerCtx.communities) {
    if (theirCommunities.has(String(cid))) sharedCommunities += 1;
  }
  if (sharedCommunities > 0) {
    score += Math.min(
      SCORE_WEIGHTS.SHARED_COMMUNITY_CAP,
      sharedCommunities * SCORE_WEIGHTS.SHARED_COMMUNITY_EACH,
    );
    reasons.push(`${sharedCommunities} shared communit${sharedCommunities > 1 ? 'ies' : 'y'}`);
  }

  // Professional signals
  const viewerCompany = normalizeToken(viewerCtx.identity.company);
  const candCompany = normalizeToken(identity.company);
  if (viewerCompany && candCompany && viewerCompany === candCompany) {
    score += SCORE_WEIGHTS.SAME_COMPANY;
    reasons.push('Same company');
  }

  const viewerRole = normalizeToken(viewerCtx.identity.designation || viewerCtx.identity.position);
  const candRole = normalizeToken(identity.designation || identity.position);
  if (viewerRole && candRole && viewerRole === candRole) {
    score += SCORE_WEIGHTS.SAME_DESIGNATION;
    reasons.push('Same designation');
  }

  return {
    user: candidate,
    score,
    reasons,
    mutual,
    mutualFollowers,
    sharedSkills: sharedSkills.length,
    sharedCommunities,
  };
}

async function fetchCandidatePool(viewerCtx, excludeIds, userTypeFilter) {
  const candidateWhere = {
    id: { [Op.notIn]: [...excludeIds] },
    is_approved: true,
    registration_status: { [Op.notIn]: INACTIVE_REGISTRATION },
  };
  if (userTypeFilter) candidateWhere.user_type = String(userTypeFilter);

  const tenantOrder =
    viewerCtx.tenantId != null
      ? [
          [
            db.sequelize.literal(
              `CASE WHEN "User"."tenant_id"::text = ${db.sequelize.escape(
                viewerCtx.tenantId,
              )} THEN 0 ELSE 1 END`,
            ),
            'ASC',
          ],
        ]
      : [];

  return db.User.findAll({
    where: candidateWhere,
    attributes: NETWORK_USER_ATTRS,
    order: [...tenantOrder, ['updated_at', 'DESC']],
    limit: CANDIDATE_POOL_LIMIT,
  });
}

async function getNetworkSuggestions(viewerId, query = {}) {
  const { page, limit, offset } = parsePagination(query);
  const userTypeFilter = query.user_type || query.role || null;

  const viewerCtx = await loadViewerContext(viewerId);
  if (!viewerCtx) {
    return {
      suggestions: [],
      pagination: { total: 0, page, pages: 1, limit },
    };
  }

  const excludeIds = await getSuggestionExclusionIds(viewerId);
  const candidates = await fetchCandidatePool(viewerCtx, excludeIds, userTypeFilter);
  const candidateIds = candidates.map((c) => c.id);

  const batchCtx = await loadCandidateBatchContext(candidateIds);
  let scored = candidates
    .map((c) => scoreCandidate(viewerCtx, c, batchCtx))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.mutual - a.mutual || b.sharedSkills - a.sharedSkills);

  if (!scored.length && candidates.length) {
    scored = candidates.slice(0, limit).map((c) => ({
      user: c,
      score: 1,
      reasons: ['Suggested for you'],
      mutual: 0,
      mutualFollowers: 0,
      sharedSkills: 0,
      sharedCommunities: 0,
    }));
  }

  const total = scored.length;
  const pageSlice = scored.slice(offset, offset + limit);
  const users = pageSlice.map((s) => s.user);
  const enriched = await enrichUsersForNetwork(viewerId, users);

  const suggestions = enriched.map((u, idx) => ({
    ...u,
    suggestion_score: pageSlice[idx].score,
    suggestion_reasons: pageSlice[idx].reasons.slice(0, 4),
    mutual_connections: pageSlice[idx].mutual,
    mutual_followers: pageSlice[idx].mutualFollowers,
    shared_skills_count: pageSlice[idx].sharedSkills,
    shared_communities_count: pageSlice[idx].sharedCommunities,
  }));

  return {
    suggestions,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      limit,
    },
  };
}

module.exports = {
  getNetworkSuggestions,
  SCORE_WEIGHTS,
  CANDIDATE_POOL_LIMIT,
};
