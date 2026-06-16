const db = require('../database/index');
const { Op } = require('sequelize');
const { ilikeContainsPattern } = require('../utils/searchQuery');
const { mergeCommunityDiscoverWhere, canAccessCommunity } = require('../utils/tenantScope');
const { tenantIdForCreate } = require('../utils/tenantHelpers');
const { processUploadedFiles, publicUrlFromMulterFile } = require('../services/mediaUploadService');
const { sanitizeCommentText } = require('../utils/commentText');
const { resolveMediaUrl } = require('../utils/resolveMediaUrl');
const { loadAcademicIdentityForUsers } = require('../utils/academicIdentity');
const { loadTenantNameMap } = require('../utils/networkHelpers');

const pg = (v, d = 1) => parseInt(String(v), 10) || d;

const USER_ATTRS = ['id', 'first_name', 'last_name', 'email', 'profile_picture', 'user_type', 'tenant_id'];

function rawProfilePicture(userLike) {
  if (!userLike) return '';
  const p = userLike.toJSON ? userLike.toJSON() : userLike;
  return (p.profile_picture || '').trim();
}

function authorAvatarUrl(author) {
  const raw = rawProfilePicture(author);
  return raw ? resolveMediaUrl(raw) || raw : '';
}

/** Collect all user_ids from a comment tree. */
function collectCommentUserIds(comments, out = new Set()) {
  if (!Array.isArray(comments)) return out;
  for (const c of comments) {
    if (c?.user_id) out.add(String(c.user_id));
    collectCommentUserIds(c.replies, out);
  }
  return out;
}

/** Load resolved avatar URLs for many users (Users + AlumniDetail fallback). */
async function loadAvatarMapForUserIds(userIds) {
  const ids = [...new Set((userIds || []).map(String).filter(Boolean))];
  const map = new Map();
  if (!ids.length) return map;

  const users = await db.User.findAll({
    where: { id: { [Op.in]: ids } },
    attributes: USER_ATTRS,
  });
  for (const u of users) {
    map.set(String(u.id), authorAvatarUrl(u));
  }

  const missing = ids.filter((id) => !map.get(id));
  if (missing.length && db.AlumniDetail) {
    const alumni = await db.AlumniDetail.findAll({
      where: { user_id: { [Op.in]: missing } },
      attributes: ['user_id', 'profile_picture'],
    });
    for (const row of alumni) {
      const uid = String(row.user_id);
      if (map.get(uid)) continue;
      const raw = (row.profile_picture || '').trim();
      if (raw) map.set(uid, resolveMediaUrl(raw) || raw);
    }
  }

  return map;
}

async function resolveAvatarForUserId(userId, authorFromJoin = null) {
  const key = userId == null ? '' : String(userId);
  if (!key) return '';
  const fromJoin = authorAvatarUrl(authorFromJoin);
  if (fromJoin) return fromJoin;

  const map = await loadAvatarMapForUserIds([key]);
  return map.get(key) || '';
}

function applyAvatarMapToComment(comment, avatarMap) {
  if (!comment || typeof comment !== 'object') return comment;
  const avatar =
    avatarMap.get(String(comment.user_id)) ||
    authorAvatarUrl(comment.author || comment.user) ||
    comment.user_avatar ||
    '';
  return {
    ...comment,
    user_avatar: avatar,
    avatar_url: avatar,
    replies: Array.isArray(comment.replies)
      ? comment.replies.map((r) => applyAvatarMapToComment(r, avatarMap))
      : [],
  };
}

function formatCommunityPostWithAvatarMap(post, avatarMap, likedByMe = false, bookmarkedByMe = false) {
  const formatted = formatCommunityPost(post, likedByMe, bookmarkedByMe);
  const avatar =
    avatarMap.get(String(formatted.user_id)) ||
    formatted.user_avatar ||
    '';
  return {
    ...formatted,
    user_avatar: avatar,
    avatar_url: avatar,
  };
}

async function enrichCommunityPostsFromRows(rows, formattedPosts) {
  if (!Array.isArray(formattedPosts) || !formattedPosts.length) return formattedPosts;
  const authors = rows
    .map((p) => {
      const plain = p.toJSON ? p.toJSON() : p;
      return plain.author || plain.user || null;
    })
    .filter(Boolean);
  const [identityMap, tenantMap] = await Promise.all([
    loadAcademicIdentityForUsers(authors),
    loadTenantNameMap(authors.map((a) => a.tenant_id)),
  ]);
  return formattedPosts.map((post, index) => {
    const plain = rows[index]?.toJSON ? rows[index].toJSON() : rows[index];
    const author = plain?.author || plain?.user;
    return applyIdentityToFormattedUser({ ...post }, author, identityMap, tenantMap);
  });
}

async function formatSingleCommunityPost(post, likedByMe = false, bookmarkedByMe = false) {
  const p = post.toJSON ? post.toJSON() : post;
  const avatarMap = await loadAvatarMapForUserIds([p.user_id]);
  const formatted = formatCommunityPostWithAvatarMap(post, avatarMap, likedByMe, bookmarkedByMe);
  const [enriched] = await enrichCommunityPostsFromRows([post], [formatted]);
  return enriched;
}

async function bookmarkedCommunityPostIds(userId, postIds) {
  if (!postIds.length) return new Set();
  const rows = await db.Bookmark.findAll({
    where: {
      user_id: userId,
      type: 'community_post',
      type_id: { [Op.in]: postIds },
    },
    attributes: ['type_id'],
    raw: true,
  });
  return new Set(rows.map((r) => String(r.type_id)));
}

async function getMembership(communityId, userId) {
  return db.CommunityMember.findOne({
    where: { community_id: communityId, user_id: userId, is_active: true },
  });
}

function denyCommunityResponse(res, req, community) {
  if (canAccessCommunity(req.user, community)) return false;
  res.status(403).json({
    status: false,
    message: community?.is_private
      ? 'This private community is only available to members of your college.'
      : 'Access denied.',
  });
  return true;
}

async function findCommunityById(req, communityId) {
  return db.Community.findOne({
    where: mergeCommunityDiscoverWhere({ id: communityId, is_active: true }, req.user),
  });
}

async function requireCommunityAccess(req, res, communityId) {
  const community = await findCommunityById(req, communityId);
  if (!community) {
    res.status(404).json({ status: false, message: 'Community not found.' });
    return null;
  }
  if (denyCommunityResponse(res, req, community)) return null;
  return community;
}

async function findCommunityPost(req, communityId, postId) {
  const community = await findCommunityById(req, communityId);
  if (!community) return { community: null, post: null };
  const post = await db.CommunityPost.findOne({
    where: { id: postId, community_id: communityId, is_deleted: false },
  });
  return { community, post };
}

async function canViewCommunityPosts(req, community) {
  if (!community.is_private) return true;
  const mem = await getMembership(community.id, req.user.id);
  return !!mem;
}

function formatCommunityComment(row) {
  const c = row.toJSON ? row.toJSON() : row;
  const author = c.author || c.user || {};
  const avatar = authorAvatarUrl(author);
  return {
    id: c.id,
    post_id: c.post_id,
    community_id: c.community_id,
    user_id: c.user_id,
    parent_id: c.parent_id || null,
    content: c.content,
    created_at: c.created_at,
    updated_at: c.updated_at,
    user_name: userDisplayName(author),
    user_type: author.user_type || null,
    user_avatar: avatar,
    avatar_url: avatar,
  };
}

function userDisplayName(u) {
  if (!u) return 'Member';
  const p = u.toJSON ? u.toJSON() : u;
  return [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || p.email || 'Member';
}

function applyIdentityToFormattedUser(target, author, identityMap, tenantMap) {
  if (!target || !author?.id) return target;
  const identity = identityMap.get(String(author.id));
  if (identity?.academic_identity) {
    target.academic_identity = identity.academic_identity;
    target.user_type = author.user_type || target.user_type || null;
  }
  if (identity?.professional_identity) {
    target.professional_identity = identity.professional_identity;
  }
  if (identity?.company) target.company = identity.company;
  if (identity?.position) target.position = identity.position;
  const tid = author.tenant_id ? String(author.tenant_id) : null;
  if (tid && tenantMap?.has(tid)) {
    target.college_name = tenantMap.get(tid).name;
  }
  return target;
}

async function enrichFormattedCommunityUsers(items, authorKey = 'author') {
  if (!Array.isArray(items) || !items.length) return items;
  const authors = items
    .map((item) => item?.[authorKey] || item?.user || null)
    .filter(Boolean);
  const [identityMap, tenantMap] = await Promise.all([
    loadAcademicIdentityForUsers(authors),
    loadTenantNameMap(authors.map((a) => a.tenant_id)),
  ]);
  return items.map((item) => {
    const author = item?.[authorKey] || item?.user;
    return applyIdentityToFormattedUser({ ...item }, author, identityMap, tenantMap);
  });
}

function formatCommunity(community, extras = {}) {
  const c = community && community.toJSON ? community.toJSON() : community || {};
  return {
    id: c.id,
    name: c.name,
    description: c.description || '',
    category: c.category,
    avatar_url: c.avatar_url || '',
    cover_url: c.cover_url || '',
    member_count: c.member_count ?? 0,
    post_count: c.post_count ?? 0,
    is_private: !!c.is_private,
    is_featured: !!c.is_featured,
    created_by: c.created_by,
    created_at: c.created_at,
    updated_at: c.updated_at,
    rules: Array.isArray(c.rules) ? c.rules : [],
    tags: Array.isArray(c.tags) ? c.tags : [],
    moderators: extras.moderators || [],
    is_member: !!extras.membership,
    role: extras.membership ? extras.membership.role : null,
  };
}

function shapeMentionedUser(user) {
  if (!user) return null;
  const u = user.toJSON ? user.toJSON() : user;
  return {
    id: u.id,
    first_name: u.first_name,
    last_name: u.last_name,
    email: u.email,
    profile_picture: u.profile_picture ? resolveMediaUrl(u.profile_picture) || u.profile_picture : null,
  };
}

function postDetailIncludes() {
  return [
    { model: db.User, as: 'author', attributes: USER_ATTRS },
    {
      model: db.CommunityPostMention,
      as: 'mentions',
      include: [{ model: db.User, as: 'mentionedUser', attributes: USER_ATTRS }],
    },
  ];
}

function formatCommunityPost(post, likedByMe = false, bookmarkedByMe = false) {
  const p = post.toJSON ? post.toJSON() : post;
  const author = p.author || p.user || {};
  const avatar = authorAvatarUrl(author);
  const imageRaw = p.image_url || '';
  return {
    id: p.id,
    community_id: p.community_id,
    user_id: p.user_id,
    user_name: userDisplayName(author),
    user_type: author.user_type || null,
    user_avatar: avatar,
    avatar_url: avatar,
    title: p.title || '',
    content: p.content,
    tags: Array.isArray(p.tags) ? p.tags : [],
    mentions: (p.mentions || []).map((m) => ({
      id: m.id,
      mentioned_user: m.mentioned_user,
      mentionedUser: shapeMentionedUser(m.mentionedUser),
    })),
    image_url: imageRaw ? resolveMediaUrl(imageRaw) || imageRaw : undefined,
    likes_count: p.likes_count ?? 0,
    comments_count: p.comments_count ?? 0,
    is_announcement: !!p.is_announcement,
    is_pinned: !!p.is_pinned,
    created_at: p.created_at,
    updated_at: p.updated_at,
    is_liked: likedByMe,
    is_bookmarked: bookmarkedByMe,
    community: p.community ? { id: p.community.id, name: p.community.name } : undefined,
  };
}

async function attachMembershipFlags(rows, userId) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const memberships = await db.CommunityMember.findAll({
    where: { user_id: userId, community_id: { [Op.in]: ids }, is_active: true },
  });
  const memMap = new Map(memberships.map((m) => [String(m.community_id), m]));
  return rows.map((row) => formatCommunity(row, { membership: memMap.get(String(row.id)) }));
}

exports.listCommunities = async (req, res) => {
  try {
    const searchRaw = req.query.search || req.query.q;
    const { category, is_private, is_featured, page = 1, limit = 20, sort } = req.query;
    const where = mergeCommunityDiscoverWhere({ is_active: true }, req.user);
    if (category && String(category).toLowerCase() !== 'all') {
      where.category = category;
    }
    if (is_private !== undefined && is_private !== '') {
      where.is_private = String(is_private) === 'true';
    }
    if (is_featured !== undefined && is_featured !== '') {
      where.is_featured = String(is_featured) === 'true';
    }
    if (searchRaw && String(searchRaw).trim()) {
      const pat = ilikeContainsPattern(searchRaw);
      if (pat) {
        where[Op.or] = [
          { name: { [Op.iLike]: pat } },
          { description: { [Op.iLike]: pat } },
        ];
      }
    }
    const lim = Math.min(100, pg(limit, 20));
    const pageNum = pg(page, 1);
    const offset = (pageNum - 1) * lim;
    const popular = sort === 'popular' || String(req.query.trending) === 'true';
    const order = popular
      ? [
          ['post_count', 'DESC'],
          ['member_count', 'DESC'],
          ['created_at', 'DESC'],
        ]
      : [['created_at', 'DESC']];

    const { count, rows } = await db.Community.findAndCountAll({
      where,
      order,
      limit: lim,
      offset,
    });

    const communities = await attachMembershipFlags(rows, req.user.id);
    return res.status(200).json({
      status: true,
      data: {
        communities,
        total: count,
        page: pageNum,
        limit: lim,
        totalPages: Math.ceil(count / lim) || 1,
      },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: 'Failed to list communities.', error: err.message });
  }
};

exports.searchCommunities = async (req, res) => {
  req.query.search = req.query.q || req.query.search;
  return exports.listCommunities(req, res);
};

exports.getFeatured = async (req, res) => {
  try {
    let rows = await db.Community.findAll({
      where: mergeCommunityDiscoverWhere({ is_active: true, is_featured: true }, req.user),
      order: [
        ['member_count', 'DESC'],
        ['created_at', 'DESC'],
      ],
      limit: 12,
    });
    if (!rows.length) {
      rows = await db.Community.findAll({
        where: mergeCommunityDiscoverWhere({ is_active: true }, req.user),
        order: [
          ['member_count', 'DESC'],
          ['created_at', 'DESC'],
        ],
        limit: 8,
      });
    }
    const communities = await attachMembershipFlags(rows, req.user.id);
    return res.status(200).json({ status: true, data: { communities } });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const tid = req.user?.tenant_id ? String(req.user.tenant_id) : null;
    const catRows = tid
      ? await db.sequelize.query(
          `SELECT DISTINCT category FROM "Communities"
           WHERE is_active = true AND category IS NOT NULL
           AND (is_private = false OR tenant_id = :tid OR tenant_id IS NULL)`,
          { replacements: { tid }, type: db.sequelize.QueryTypes.SELECT },
        )
      : await db.sequelize.query(
          'SELECT DISTINCT category FROM "Communities" WHERE is_active = true AND category IS NOT NULL',
          { type: db.sequelize.QueryTypes.SELECT },
        );
    const fromDb = catRows.map((r) => r.category).filter(Boolean);
    const defaults = ['Technology', 'Science', 'Education', 'Business', 'Arts', 'General'];
    const merged = [...new Set([...defaults, ...fromDb])].sort((a, b) => a.localeCompare(b));
    const categories = merged.map((name, i) => ({
      id: String(i + 1),
      name,
      description: '',
      icon: 'users',
      color: '#6366f1',
    }));
    return res.status(200).json({ status: true, data: { categories } });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.getUserCommunities = async (req, res) => {
  try {
    const lim = Math.min(100, pg(req.query.limit, 50));
    const pageNum = pg(req.query.page, 1);
    const offset = (pageNum - 1) * lim;
    const whereMem = { user_id: req.user.id, is_active: true };
    if (req.query.role) whereMem.role = req.query.role;

    const { count, rows } = await db.CommunityMember.findAndCountAll({
      where: whereMem,
      include: [
        {
          model: db.Community,
          as: 'community',
          where: mergeCommunityDiscoverWhere({ is_active: true }, req.user),
          required: true,
        },
      ],
      order: [[{ model: db.Community, as: 'community' }, 'name', 'ASC']],
      limit: lim,
      offset,
    });

    const communities = rows.map((r) => formatCommunity(r.community, { membership: r }));
    return res.status(200).json({
      status: true,
      data: {
        communities,
        total: count,
        page: pageNum,
        limit: lim,
      },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.getMyCommunitiesFeed = async (req, res) => {
  try {
    const lim = Math.min(50, pg(req.query.limit, 20));
    const pageNum = pg(req.query.page, 1);
    const offset = (pageNum - 1) * lim;

    const memberRows = await db.CommunityMember.findAll({
      where: { user_id: req.user.id, is_active: true },
      attributes: ['community_id'],
    });
    const ids = memberRows.map((r) => r.community_id);
    if (!ids.length) {
      return res.status(200).json({
        status: true,
        data: { posts: [], total: 0, page: pageNum, limit: lim },
      });
    }

    const memberCommunities = await db.Community.findAll({
      where: { id: { [Op.in]: ids }, is_active: true },
      attributes: ['id', 'is_private', 'tenant_id'],
    });
    const scopedIds = memberCommunities
      .filter((c) => canAccessCommunity(req.user, c))
      .map((c) => c.id);
    if (!scopedIds.length) {
      return res.status(200).json({
        status: true,
        data: { posts: [], total: 0, page: pageNum, limit: lim },
      });
    }

    const { count, rows } = await db.CommunityPost.findAndCountAll({
      where: { community_id: { [Op.in]: scopedIds }, is_deleted: false },
      include: [
        { model: db.User, as: 'author', attributes: USER_ATTRS },
        { model: db.Community, as: 'community', attributes: ['id', 'name'] },
      ],
      order: [
        ['is_pinned', 'DESC'],
        ['created_at', 'DESC'],
      ],
      limit: lim,
      offset,
    });

    const postIds = rows.map((p) => p.id);
    const myLikes = postIds.length
      ? await db.CommunityPostLike.findAll({
          where: { user_id: req.user.id, post_id: { [Op.in]: postIds } },
          attributes: ['post_id'],
          raw: true,
        })
      : [];
    const likedSet = new Set(myLikes.map((l) => String(l.post_id)));
    const bookmarkedSet = await bookmarkedCommunityPostIds(req.user.id, postIds);
    const avatarMap = await loadAvatarMapForUserIds(rows.map((p) => p.user_id));

    const posts = rows.map((p) =>
      formatCommunityPostWithAvatarMap(
        p,
        avatarMap,
        likedSet.has(String(p.id)),
        bookmarkedSet.has(String(p.id)),
      ),
    );
    const enrichedPosts = await enrichCommunityPostsFromRows(rows, posts);
    return res.status(200).json({
      status: true,
      data: { posts: enrichedPosts, total: count, page: pageNum, limit: lim },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.getCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const community = await requireCommunityAccess(req, res, communityId);
    if (!community) return;
    const membership = await getMembership(communityId, req.user.id);
    const mods = await db.CommunityMember.findAll({
      where: {
        community_id: communityId,
        is_active: true,
        role: { [Op.in]: ['moderator', 'admin'] },
      },
      include: [{ model: db.User, as: 'user', attributes: USER_ATTRS }],
      limit: 8,
    });
    const moderators = mods.map((m) => {
      const u = m.user;
      return {
        id: u.id,
        name: userDisplayName(u),
        avatar_url: u.profile_picture || '',
        role: m.role,
      };
    });
    return res.status(200).json({
      status: true,
      data: { community: formatCommunity(community, { membership, moderators }) },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.createCommunity = async (req, res) => {
  try {
    const { name, description, category, is_private, rules, tags, avatar_url, cover_url } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ status: false, message: 'Name is required.' });
    }
    const result = await db.sequelize.transaction(async (t) => {
      const community = await db.Community.create(
        {
          name: String(name).trim(),
          description: description != null ? String(description) : '',
          category: category ? String(category) : 'General',
          is_private: !!is_private,
          rules: Array.isArray(rules) ? rules : [],
          tags: Array.isArray(tags) ? tags : [],
          avatar_url: avatar_url || null,
          cover_url: cover_url || null,
          tenant_id: tenantIdForCreate(req),
          created_by: req.user.id,
          member_count: 1,
          post_count: 0,
        },
        { transaction: t }
      );
      await db.CommunityMember.create(
        {
          community_id: community.id,
          user_id: req.user.id,
          role: 'admin',
          is_active: true,
          joined_at: new Date(),
        },
        { transaction: t }
      );
      return community;
    });
    const membership = await getMembership(result.id, req.user.id);
    return res.status(201).json({
      status: true,
      message: 'Community created.',
      data: { community: formatCommunity(result, { membership, moderators: [] }) },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.updateCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const community = await requireCommunityAccess(req, res, communityId);
    if (!community) return;
    const mem = await getMembership(communityId, req.user.id);
    if (!mem || !['admin', 'moderator'].includes(mem.role)) {
      return res.status(403).json({ status: false, message: 'Not allowed to update this community.' });
    }
    const {
      name,
      description,
      category,
      is_private,
      rules,
      tags,
      avatar_url,
      cover_url,
      is_featured,
    } = req.body;
    if (mem.role !== 'admin' && is_featured !== undefined) {
      return res.status(403).json({ status: false, message: 'Only admins can change featured status.' });
    }
    const updates = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (description !== undefined) updates.description = String(description);
    if (category !== undefined) updates.category = String(category);
    if (is_private !== undefined) updates.is_private = !!is_private;
    if (rules !== undefined) updates.rules = Array.isArray(rules) ? rules : [];
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [];
    if (avatar_url !== undefined) updates.avatar_url = avatar_url || null;
    if (cover_url !== undefined) updates.cover_url = cover_url || null;
    if (mem.role === 'admin' && is_featured !== undefined) updates.is_featured = !!is_featured;
    await community.update(updates);
    const membership = await getMembership(communityId, req.user.id);
    return res.status(200).json({
      status: true,
      message: 'Community updated.',
      data: { community: formatCommunity(community, { membership }) },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.deleteCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const community = await requireCommunityAccess(req, res, communityId);
    if (!community) return;
    const mem = await getMembership(communityId, req.user.id);
    const isCreator = String(community.created_by) === String(req.user.id);
    if (!isCreator && (!mem || mem.role !== 'admin')) {
      return res.status(403).json({ status: false, message: 'Not allowed to delete this community.' });
    }
    await db.sequelize.transaction(async (t) => {
      await community.update({ is_active: false }, { transaction: t });
      await db.CommunityMember.update(
        { is_active: false },
        { where: { community_id: communityId }, transaction: t }
      );
    });
    return res.status(200).json({ status: true, message: 'Community deleted.' });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.joinCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const community = await requireCommunityAccess(req, res, communityId);
    if (!community) return;
    if (community.is_private && !canAccessCommunity(req.user, community)) {
      return res.status(403).json({
        status: false,
        message: 'Cannot join a private community from another college.',
      });
    }
    let member = await db.CommunityMember.findOne({
      where: { community_id: communityId, user_id: req.user.id },
    });
    if (member && member.is_active) {
      return res.status(200).json({ status: true, message: 'Already a member.' });
    }
    if (!member) {
      await db.CommunityMember.create({
        community_id: communityId,
        user_id: req.user.id,
        role: 'member',
        is_active: true,
        joined_at: new Date(),
      });
    } else {
      await member.update({ is_active: true, joined_at: new Date() });
    }
    await community.increment('member_count');
    return res.status(200).json({ status: true, message: 'Joined community.' });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.leaveCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const community = await requireCommunityAccess(req, res, communityId);
    if (!community) return;
    const member = await db.CommunityMember.findOne({
      where: { community_id: communityId, user_id: req.user.id, is_active: true },
    });
    if (!member) {
      return res.status(400).json({ status: false, message: 'Not a member.' });
    }
    const adminCount = await db.CommunityMember.count({
      where: { community_id: communityId, is_active: true, role: 'admin' },
    });
    if (member.role === 'admin' && adminCount <= 1) {
      return res.status(400).json({
        status: false,
        message: 'Transfer admin or delete the community before leaving as the only admin.',
      });
    }
    await member.update({ is_active: false });
    await community.decrement('member_count', { by: 1 });
    const c2 = await db.Community.findByPk(communityId);
    if (c2 && c2.member_count < 0) await c2.update({ member_count: 0 });
    return res.status(200).json({ status: true, message: 'Left community.' });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.getMembers = async (req, res) => {
  try {
    const { communityId } = req.params;
    const community = await requireCommunityAccess(req, res, communityId);
    if (!community) return;
    const lim = Math.min(100, pg(req.query.limit, 30));
    const pageNum = pg(req.query.page, 1);
    const offset = (pageNum - 1) * lim;
    const where = { community_id: communityId, is_active: true };
    if (req.query.role) where.role = req.query.role;

    const { count, rows } = await db.CommunityMember.findAndCountAll({
      where,
      include: [{ model: db.User, as: 'user', attributes: USER_ATTRS }],
      order: [['joined_at', 'ASC']],
      limit: lim,
      offset,
    });

    const members = rows.map((m) => ({
      id: m.id,
      user_id: m.user_id,
      user_name: userDisplayName(m.user),
      user_type: m.user?.user_type || null,
      user_avatar: authorAvatarUrl(m.user),
      avatar_url: authorAvatarUrl(m.user),
      role: m.role,
      joined_at: m.joined_at,
      is_active: m.is_active,
      _author: m.user,
    }));

    const authors = members.map((m) => m._author).filter(Boolean);
    const [identityMap, tenantMap] = await Promise.all([
      loadAcademicIdentityForUsers(authors),
      loadTenantNameMap(authors.map((a) => a.tenant_id)),
    ]);
    const enrichedMembers = members.map((m) => {
      const { _author, ...rest } = m;
      return applyIdentityToFormattedUser(rest, _author, identityMap, tenantMap);
    });

    return res.status(200).json({
      status: true,
      data: { members: enrichedMembers, total: count, page: pageNum, limit: lim },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const { communityId, userId } = req.params;
    const community = await requireCommunityAccess(req, res, communityId);
    if (!community) return;
    const mem = await getMembership(communityId, req.user.id);
    if (!mem || !['admin', 'moderator'].includes(mem.role)) {
      return res.status(403).json({ status: false, message: 'Not allowed.' });
    }
    const target = await db.CommunityMember.findOne({
      where: { community_id: communityId, user_id: userId, is_active: true },
    });
    if (!target) {
      return res.status(404).json({ status: false, message: 'Member not found.' });
    }
    if (target.role === 'admin' && mem.role !== 'admin') {
      return res.status(403).json({ status: false, message: 'Only admins can remove admins.' });
    }
    if (String(userId) === String(req.user.id)) {
      return res.status(400).json({ status: false, message: 'Use leave to remove yourself.' });
    }
    await target.update({ is_active: false });
    await community.decrement('member_count', { by: 1 });
    return res.status(200).json({ status: true, message: 'Member removed.' });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.updateMemberRole = async (req, res) => {
  try {
    const { communityId, userId } = req.params;
    const community = await requireCommunityAccess(req, res, communityId);
    if (!community) return;
    const { role } = req.body;
    const valid = ['member', 'moderator', 'admin'];
    if (!valid.includes(role)) {
      return res.status(400).json({ status: false, message: 'Invalid role.' });
    }
    const mem = await getMembership(communityId, req.user.id);
    if (!mem || mem.role !== 'admin') {
      return res.status(403).json({ status: false, message: 'Only admins can change roles.' });
    }
    const target = await db.CommunityMember.findOne({
      where: { community_id: communityId, user_id: userId, is_active: true },
    });
    if (!target) {
      return res.status(404).json({ status: false, message: 'Member not found.' });
    }
    await target.update({ role });
    return res.status(200).json({ status: true, message: 'Role updated.' });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.getPosts = async (req, res) => {
  try {
    const { communityId } = req.params;
    const community = await requireCommunityAccess(req, res, communityId);
    if (!community) return;
    if (!(await canViewCommunityPosts(req, community))) {
      return res.status(403).json({
        status: false,
        message: 'Join this private community to view posts.',
      });
    }
    const lim = Math.min(100, pg(req.query.limit, 20));
    const pageNum = pg(req.query.page, 1);
    const offset = (pageNum - 1) * lim;

    const { count, rows } = await db.CommunityPost.findAndCountAll({
      where: { community_id: communityId, is_deleted: false },
      include: [{ model: db.User, as: 'author', attributes: USER_ATTRS }],
      order: [
        ['is_pinned', 'DESC'],
        ['created_at', 'DESC'],
      ],
      limit: lim,
      offset,
    });

    const postIds = rows.map((p) => p.id);
    const myLikes = postIds.length
      ? await db.CommunityPostLike.findAll({
          where: { user_id: req.user.id, post_id: { [Op.in]: postIds } },
          attributes: ['post_id'],
          raw: true,
        })
      : [];
    const likedSet = new Set(myLikes.map((l) => String(l.post_id)));
    const bookmarkedSet = await bookmarkedCommunityPostIds(req.user.id, postIds);
    const avatarMap = await loadAvatarMapForUserIds(rows.map((p) => p.user_id));
    const posts = rows.map((p) =>
      formatCommunityPostWithAvatarMap(
        p,
        avatarMap,
        likedSet.has(String(p.id)),
        bookmarkedSet.has(String(p.id)),
      ),
    );
    const enrichedPosts = await enrichCommunityPostsFromRows(rows, posts);
    return res.status(200).json({
      status: true,
      data: { posts: enrichedPosts, total: count, page: pageNum, limit: lim },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.createPost = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { title, content, image_url, tags: tagsRaw, mentioned_users: mentionedRaw } = req.body;
    const { parseMentionedUsers, notifyMentionedUsers } = require('../utils/mentionNotify');
    const { mergeUniqueTags, stripHashtagsFromContent } = require('../utils/hashtagUtils');
    if (content == null || !String(content).trim()) {
      return res.status(400).json({ status: false, message: 'Content is required.' });
    }
    const community = await requireCommunityAccess(req, res, communityId);
    if (!community) return;
    const mem = await getMembership(communityId, req.user.id);
    if (!mem) {
      return res.status(403).json({ status: false, message: 'Join the community to post.' });
    }
    const mergedTags = mergeUniqueTags(tagsRaw, content);
    const cleanContent = stripHashtagsFromContent(content) || String(content).trim();
    const mentioned_users = [...new Set(parseMentionedUsers(mentionedRaw).map(String))];
    let imageUrl = image_url || null;
    const files = req.files || (req.file ? [req.file] : []);
    if (files.length) {
      const descriptors = await processUploadedFiles(files, 'post');
      if (descriptors[0]) imageUrl = descriptors[0].url;
    }
    const post = await db.CommunityPost.create({
      community_id: communityId,
      user_id: req.user.id,
      tenant_id: community.tenant_id || tenantIdForCreate(req),
      title: title != null ? String(title).slice(0, 300) : '',
      content: cleanContent,
      tags: mergedTags.length ? mergedTags : null,
      image_url: imageUrl,
    });
    if (mentioned_users.length) {
      await db.CommunityPostMention.bulkCreate(
        mentioned_users.map((mentioned_user) => ({ post_id: post.id, mentioned_user })),
      );
      const actor = [req.user.first_name, req.user.last_name].filter(Boolean).join(' ') || 'Someone';
      await notifyMentionedUsers({
        mentionedUserIds: mentioned_users,
        reqUser: req.user,
        title: 'You were mentioned in a community post',
        body: `${actor} mentioned you in ${community.name}`,
        link_url: `/communities/${communityId}`,
        metadata: { community_id: communityId, post_id: post.id },
      });
    }
    await community.increment('post_count');
    const withAuthor = await db.CommunityPost.findByPk(post.id, {
      include: postDetailIncludes(),
    });
    return res.status(201).json({
      status: true,
      message: 'Post created.',
      data: { post: await formatSingleCommunityPost(withAuthor, false, false) },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const { communityId, postId } = req.params;
    const { community, post } = await findCommunityPost(req, communityId, postId);
    if (!community) {
      return res.status(404).json({ status: false, message: 'Community not found.' });
    }
    if (!post) {
      return res.status(404).json({ status: false, message: 'Post not found.' });
    }
    const mem = await getMembership(communityId, req.user.id);
    const isAuthor = String(post.user_id) === String(req.user.id);
    const isMod = mem && ['admin', 'moderator'].includes(mem.role);
    if (!isAuthor && !isMod) {
      return res.status(403).json({ status: false, message: 'Not allowed.' });
    }
    const {
      title,
      content,
      image_url,
      is_announcement,
      is_pinned,
      tags: tagsRaw,
      mentioned_users: mentionedRaw,
    } = req.body;
    const { parseMentionedUsers, notifyMentionedUsers } = require('../utils/mentionNotify');
    const { mergeUniqueTags, stripHashtagsFromContent } = require('../utils/hashtagUtils');
    const updates = {};
    if (title !== undefined) updates.title = String(title).slice(0, 300);
    if (content !== undefined) {
      updates.content = stripHashtagsFromContent(content) || String(content).trim();
      updates.tags = mergeUniqueTags(tagsRaw, content);
    }
    if (image_url !== undefined) updates.image_url = image_url || null;
    const files = req.files || (req.file ? [req.file] : []);
    if (files.length) {
      const descriptors = await processUploadedFiles(files, 'post');
      if (descriptors[0]) updates.image_url = descriptors[0].url;
    }
    if (isMod) {
      if (is_announcement !== undefined) updates.is_announcement = !!is_announcement;
      if (is_pinned !== undefined) updates.is_pinned = !!is_pinned;
    }
    await post.update(updates);
    if (mentionedRaw !== undefined) {
      const mentioned_users = [...new Set(parseMentionedUsers(mentionedRaw).map(String))];
      await db.CommunityPostMention.destroy({ where: { post_id: post.id } });
      if (mentioned_users.length) {
        await db.CommunityPostMention.bulkCreate(
          mentioned_users.map((mentioned_user) => ({ post_id: post.id, mentioned_user })),
        );
      }
    }
    const withAuthor = await db.CommunityPost.findByPk(post.id, {
      include: postDetailIncludes(),
    });
    return res.status(200).json({
      status: true,
      message: 'Post updated.',
      data: { post: await formatSingleCommunityPost(withAuthor, false, false) },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const { communityId, postId } = req.params;
    const { community, post } = await findCommunityPost(req, communityId, postId);
    if (!community) {
      return res.status(404).json({ status: false, message: 'Community not found.' });
    }
    if (!post) {
      return res.status(404).json({ status: false, message: 'Post not found.' });
    }
    const mem = await getMembership(communityId, req.user.id);
    const isAuthor = String(post.user_id) === String(req.user.id);
    const isMod = mem && ['admin', 'moderator'].includes(mem.role);
    if (!isAuthor && !isMod) {
      return res.status(403).json({ status: false, message: 'Not allowed.' });
    }
    await post.update({ is_deleted: true });
    if (community.post_count > 0) await community.decrement('post_count');
    return res.status(200).json({ status: true, message: 'Post deleted.' });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.togglePostLike = async (req, res) => {
  try {
    const { communityId, postId } = req.params;
    const { community, post } = await findCommunityPost(req, communityId, postId);
    if (!community) {
      return res.status(404).json({ status: false, message: 'Community not found.' });
    }
    if (!post) {
      return res.status(404).json({ status: false, message: 'Post not found.' });
    }
    const mem = await getMembership(communityId, req.user.id);
    if (!mem) {
      return res.status(403).json({ status: false, message: 'Join the community to like posts.' });
    }
    const existing = await db.CommunityPostLike.findOne({
      where: { post_id: postId, user_id: req.user.id },
    });
    if (existing) {
      await existing.destroy();
      await post.decrement('likes_count');
      return res.status(200).json({ status: true, message: 'Unliked.', data: { is_liked: false } });
    }
    await db.CommunityPostLike.create({ post_id: postId, user_id: req.user.id });
    await post.increment('likes_count');
    return res.status(200).json({ status: true, message: 'Liked.', data: { is_liked: true } });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.getPost = async (req, res) => {
  try {
    const { communityId, postId } = req.params;
    const { community, post } = await findCommunityPost(req, communityId, postId);
    if (!community) {
      return res.status(404).json({ status: false, message: 'Community not found.' });
    }
    if (!post) {
      return res.status(404).json({ status: false, message: 'Post not found.' });
    }
    if (!(await canViewCommunityPosts(req, community))) {
      return res.status(403).json({
        status: false,
        message: 'Join this private community to view posts.',
      });
    }
    const withAuthor = await db.CommunityPost.findByPk(post.id, {
      include: [{ model: db.User, as: 'author', attributes: USER_ATTRS }],
    });
    const liked = await db.CommunityPostLike.findOne({
      where: { post_id: postId, user_id: req.user.id },
    });
    const bookmarked = await db.Bookmark.findOne({
      where: {
        user_id: req.user.id,
        type: 'community_post',
        type_id: postId,
      },
    });
    return res.status(200).json({
      status: true,
      data: { post: await formatSingleCommunityPost(withAuthor, !!liked, !!bookmarked) },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.getPostComments = async (req, res) => {
  try {
    const { communityId, postId } = req.params;
    const { community, post } = await findCommunityPost(req, communityId, postId);
    if (!community || !post) {
      return res.status(404).json({ status: false, message: 'Post not found.' });
    }
    if (!(await canViewCommunityPosts(req, community))) {
      return res.status(403).json({
        status: false,
        message: 'Join this private community to view comments.',
      });
    }
    const lim = Math.min(200, pg(req.query.limit, 50));
    const pageNum = pg(req.query.page, 1);

    const rows = await db.CommunityPostComment.findAll({
      where: { post_id: postId, community_id: communityId, is_deleted: false },
      include: [{ model: db.User, as: 'author', attributes: USER_ATTRS }],
      order: [['created_at', 'ASC']],
      limit: lim,
    });

    const nodeMap = new Map();
    const roots = [];
    rows.forEach((row) => {
      const node = { ...formatCommunityComment(row), replies: [] };
      nodeMap.set(String(row.id), node);
    });
    rows.forEach((row) => {
      const node = nodeMap.get(String(row.id));
      const parentId = row.parent_id ? String(row.parent_id) : null;
      if (parentId && nodeMap.has(parentId)) {
        nodeMap.get(parentId).replies.push(node);
      } else {
        roots.push(node);
      }
    });

    const topLevelCount = await db.CommunityPostComment.count({
      where: {
        post_id: postId,
        community_id: communityId,
        is_deleted: false,
        parent_id: null,
      },
    });

    const avatarMap = await loadAvatarMapForUserIds([...collectCommentUserIds(roots)]);
    const comments = roots.map((c) => applyAvatarMapToComment(c, avatarMap));

    const authors = rows
      .map((row) => {
        const plain = row.toJSON ? row.toJSON() : row;
        return plain.author || null;
      })
      .filter(Boolean);
    const [identityMap, tenantMap] = await Promise.all([
      loadAcademicIdentityForUsers(authors),
      loadTenantNameMap(authors.map((a) => a.tenant_id)),
    ]);
    const authorByUserId = new Map();
    for (const row of rows) {
      const plain = row.toJSON ? row.toJSON() : row;
      if (plain.author) authorByUserId.set(String(plain.user_id), plain.author);
    }
    const applyIdentityToComments = (nodes) => {
      for (const node of nodes || []) {
        applyIdentityToFormattedUser(
          node,
          authorByUserId.get(String(node.user_id)),
          identityMap,
          tenantMap,
        );
        applyIdentityToComments(node.replies);
      }
    };
    applyIdentityToComments(comments);

    return res.status(200).json({
      status: true,
      data: { comments, total: topLevelCount, page: pageNum, limit: lim },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.createPostComment = async (req, res) => {
  try {
    const { communityId, postId } = req.params;
    const { content, parent_id, mentioned_users: mentionedRaw } = req.body;
    const { parseMentionedUsers, notifyMentionedUsers } = require('../utils/mentionNotify');
    const text = sanitizeCommentText(content);
    if (!text) {
      return res.status(400).json({ status: false, message: 'Comment content is required.' });
    }
    const { community, post } = await findCommunityPost(req, communityId, postId);
    if (!community || !post) {
      return res.status(404).json({ status: false, message: 'Post not found.' });
    }
    const mem = await getMembership(communityId, req.user.id);
    if (!mem) {
      return res.status(403).json({ status: false, message: 'Join the community to comment.' });
    }
    if (parent_id) {
      const parent = await db.CommunityPostComment.findOne({
        where: {
          id: parent_id,
          post_id: postId,
          community_id: communityId,
          is_deleted: false,
        },
      });
      if (!parent) {
        return res.status(400).json({ status: false, message: 'Parent comment not found.' });
      }
    }
    const mentioned_users = [...new Set(parseMentionedUsers(mentionedRaw).map(String))];

    const comment = await db.CommunityPostComment.create({
      post_id: postId,
      community_id: communityId,
      tenant_id: community.tenant_id || tenantIdForCreate(req),
      user_id: req.user.id,
      parent_id: parent_id || null,
      content: text,
    });

    if (mentioned_users.length) {
      await db.CommunityPostCommentMention.bulkCreate(
        mentioned_users.map((mentioned_user) => ({
          comment_id: comment.id,
          mentioned_user,
        })),
      );
      await notifyMentionedUsers({
        mentionedUserIds: mentioned_users,
        reqUser: req.user,
        title: 'You were mentioned in a community comment',
        body: `${[req.user.first_name, req.user.last_name].filter(Boolean).join(' ') || 'Someone'} mentioned you`,
        link_url: `/communities/${communityId}/posts/${postId}#comment-${comment.id}`,
        metadata: {
          community_id: communityId,
          post_id: postId,
          comment_id: comment.id,
          entity_type: 'community_post',
          entity_id: postId,
        },
      });
    }

    await post.increment('comments_count');
    const withAuthor = await db.CommunityPostComment.findByPk(comment.id, {
      include: [{ model: db.User, as: 'author', attributes: USER_ATTRS }],
    });
    const formatted = formatCommunityComment(withAuthor);
    const avatarMap = await loadAvatarMapForUserIds([formatted.user_id]);
    return res.status(201).json({
      status: true,
      message: 'Comment added.',
      data: { comment: applyAvatarMapToComment(formatted, avatarMap) },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.deletePostComment = async (req, res) => {
  try {
    const { communityId, postId, commentId } = req.params;
    const community = await requireCommunityAccess(req, res, communityId);
    if (!community) return;
    const comment = await db.CommunityPostComment.findOne({
      where: { id: commentId, post_id: postId, community_id: communityId, is_deleted: false },
    });
    if (!comment) {
      return res.status(404).json({ status: false, message: 'Comment not found.' });
    }
    const mem = await getMembership(communityId, req.user.id);
    const isAuthor = String(comment.user_id) === String(req.user.id);
    const isMod = mem && ['admin', 'moderator'].includes(mem.role);
    if (!isAuthor && !isMod) {
      return res.status(403).json({ status: false, message: 'Not allowed.' });
    }
    await comment.update({ is_deleted: true });
    const post = await db.CommunityPost.findByPk(postId);
    if (post && post.comments_count > 0) await post.decrement('comments_count');
    return res.status(200).json({ status: true, message: 'Comment deleted.' });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.uploadCommunityAvatar = async (req, res) => {
  try {
    const { communityId } = req.params;
    const community = await requireCommunityAccess(req, res, communityId);
    if (!community) return;
    const mem = await getMembership(communityId, req.user.id);
    if (!mem || !['admin', 'moderator'].includes(mem.role)) {
      return res.status(403).json({ status: false, message: 'Not allowed.' });
    }
    if (!req.file) {
      return res.status(400).json({ status: false, message: 'Avatar file is required.' });
    }
    const url = await publicUrlFromMulterFile(req.file, 'avatar');
    await community.update({ avatar_url: url });
    return res.status(200).json({
      status: true,
      message: 'Avatar updated.',
      data: { avatar_url: url },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.uploadCommunityCover = async (req, res) => {
  try {
    const { communityId } = req.params;
    const community = await requireCommunityAccess(req, res, communityId);
    if (!community) return;
    const mem = await getMembership(communityId, req.user.id);
    if (!mem || !['admin', 'moderator'].includes(mem.role)) {
      return res.status(403).json({ status: false, message: 'Not allowed.' });
    }
    if (!req.file) {
      return res.status(400).json({ status: false, message: 'Cover file is required.' });
    }
    const url = await publicUrlFromMulterFile(req.file, 'cover');
    await community.update({ cover_url: url });
    return res.status(200).json({
      status: true,
      message: 'Cover updated.',
      data: { cover_url: url },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};
