const { Op } = require('sequelize');
const db = require('../database/index');
const { enrichUsersForNetwork, NETWORK_USER_ATTRS } = require('./networkHelpers');
const { enrichPostsWithAcademicIdentity } = require('./academicIdentity');
const { resolveMediaUrl } = require('./resolveMediaUrl');

const POST_AUTHOR_USER_ATTRS = [
  'id',
  'first_name',
  'last_name',
  'profile_picture',
  'tenant_id',
  'user_type',
];

function postAuthorUserInclude(overrides = {}) {
  return {
    model: db.User,
    as: 'user',
    attributes: POST_AUTHOR_USER_ATTRS,
    required: true,
    include: [
      {
        model: db.Tenant,
        as: 'tenant',
        attributes: ['tenant_id', 'name', 'short_name', 'slug'],
        required: false,
      },
    ],
    ...overrides,
  };
}

function attachAuthorCollegeFields(plain) {
  if (!plain?.user) return;
  const tenant = plain.user.tenant;
  const collegeName = tenant?.name || tenant?.short_name || null;
  if (collegeName) {
    plain.user.college_name = collegeName;
    plain.user.tenant_name = collegeName;
  }
}

function enrichPostForClient(plain) {
  if (!plain || typeof plain !== 'object') return plain;
  if (plain.user?.profile_picture) {
    plain.user.profile_picture = resolveMediaUrl(plain.user.profile_picture);
  }
  attachAuthorCollegeFields(plain);
  delete plain.likes;
  delete plain.reposts;
  return plain;
}

function decoratePostRow(plain, viewerId) {
  plain.feed_type = 'post';
  plain.sort_at = plain.created_at;
  plain.is_liked =
    Array.isArray(plain.likes) && plain.likes.some((l) => l.user_id === viewerId);
  plain.is_reposted =
    Array.isArray(plain.reposts) && plain.reposts.some((r) => r.user_id === viewerId);
  plain.is_amplified = plain.is_reposted;
  plain.amplifies_count = plain.reposts_count ?? 0;
  plain.is_bookmarked = plain.is_bookmarked || false;
  return enrichPostForClient(plain);
}

function isPostReadableByViewer(post, viewer) {
  if (!post) return false;
  const viewerId = viewer?.id;
  const viewerTenant = viewer?.tenant_id;

  if (post.visibility === 'private' && post.user_id !== viewerId) return false;
  if (
    post.visibility === 'college' &&
    post.user?.tenant_id &&
    viewerTenant &&
    String(post.user.tenant_id) !== String(viewerTenant) &&
    post.user_id !== viewerId
  ) {
    return false;
  }
  return true;
}

async function hydrateAmplifierUser(amplifierRow, viewerId) {
  if (!amplifierRow) return null;
  const enriched = await enrichUsersForNetwork(viewerId, [amplifierRow], { includeMutual: false });
  const u = enriched[0];
  if (!u) return null;
  const avatar = resolveMediaUrl(u.profile_picture);
  return {
    id: u.id,
    first_name: u.first_name,
    last_name: u.last_name,
    full_name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'User',
    name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'User',
    profile_picture: avatar,
    avatar_url: avatar,
    user_type: u.user_type,
    college_name: u.college_name || null,
    academic_identity: u.academic_identity || null,
    professional_identity: u.professional_identity || null,
    is_following: Boolean(u.is_following),
  };
}

async function formatAmplifyFeedItem(amplifyPlain, viewerId) {
  const original = amplifyPlain.post;
  if (!original) return null;

  const postPlain = original.get ? original.get({ plain: true }) : original;
  const decorated = decoratePostRow(postPlain, viewerId);
  const amplifier = await hydrateAmplifierUser(
    amplifyPlain.user?.get ? amplifyPlain.user.get({ plain: true }) : amplifyPlain.user,
    viewerId,
  );

  return {
    feed_type: 'amplify',
    id: `amplify-${amplifyPlain.id}`,
    amplify_id: amplifyPlain.id,
    amplify_comment: amplifyPlain.amplify_comment || null,
    amplified_at: amplifyPlain.created_at,
    sort_at: amplifyPlain.created_at,
    amplifier,
    original_post: decorated,
    original_post_id: decorated.id,
  };
}

async function queryAmplifiesList(req, { profileUserId = null, page = 1, limit = 10 } = {}) {
  const lim = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 10));
  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const offset = (pageNum - 1) * lim;
  const viewerId = req.user.id;

  const amplifyWhere = {};
  const amplifierInclude = {
    model: db.User,
    as: 'user',
    attributes: NETWORK_USER_ATTRS,
    required: true,
  };

  if (profileUserId) {
    amplifyWhere.user_id = profileUserId;
  } else if (req.user.tenant_id) {
    amplifierInclude.where = { tenant_id: req.user.tenant_id };
  }

  const { count, rows } = await db.PostRepost.findAndCountAll({
    where: amplifyWhere,
    include: [
      amplifierInclude,
      {
        model: db.Post,
        as: 'post',
        required: true,
        include: [
          postAuthorUserInclude(),
          {
            model: db.PostMention,
            as: 'mentions',
            required: false,
            include: [
              {
                model: db.User,
                as: 'mentionedUser',
                attributes: ['id', 'first_name', 'last_name', 'profile_picture'],
              },
            ],
          },
          { model: db.Like, as: 'likes', required: false, attributes: ['user_id'] },
          { model: db.PostRepost, as: 'reposts', required: false, attributes: ['user_id'] },
          {
            model: db.Comment,
            as: 'comments',
            separate: true,
            limit: 3,
            order: [['created_at', 'DESC']],
            include: [
              {
                model: db.User,
                as: 'user',
                attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'user_type'],
              },
            ],
          },
        ],
      },
    ],
    order: [['created_at', 'DESC']],
    offset,
    limit: lim,
    distinct: true,
  });

  const items = [];
  for (const row of rows) {
    const plain = row.get({ plain: true });
    if (!isPostReadableByViewer(plain.post, req.user)) continue;
    const formatted = await formatAmplifyFeedItem(plain, viewerId);
    if (formatted) items.push(formatted);
  }

  if (items.length) {
    const originals = items.map((i) => i.original_post).filter(Boolean);
    await enrichPostsWithAcademicIdentity(originals);
  }

  return {
    items,
    pagination: {
      total: count,
      page: pageNum,
      pages: Math.ceil(count / lim) || 1,
    },
  };
}

function mergeFeedTimeline(postItems, amplifyItems, { page = 1, limit = 10 } = {}) {
  const lim = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 10));
  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);

  const merged = [...postItems, ...amplifyItems].sort((a, b) => {
    const ta = new Date(a.sort_at || a.created_at || a.amplified_at || 0).getTime();
    const tb = new Date(b.sort_at || b.created_at || b.amplified_at || 0).getTime();
    return tb - ta;
  });

  const total = merged.length;
  const start = (pageNum - 1) * lim;
  const pageItems = merged.slice(start, start + lim);

  return {
    posts: pageItems,
    pagination: {
      total,
      page: pageNum,
      pages: Math.ceil(total / lim) || 1,
    },
  };
}

module.exports = {
  decoratePostRow,
  enrichPostForClient,
  formatAmplifyFeedItem,
  queryAmplifiesList,
  mergeFeedTimeline,
  isPostReadableByViewer,
  POST_AUTHOR_USER_ATTRS,
};
