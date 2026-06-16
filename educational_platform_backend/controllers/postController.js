const db = require('../database/index');
const { Op, col, where: sqlWhere } = require('sequelize');
const NotificationService = require('../services/notificationService');
const { normalizeSearchQuery, stripLikeMetacharacters } = require('../utils/searchQuery');
const { sanitizeCommentText } = require('../utils/commentText');
const {
  buildCommentTree,
  sortRootComments,
  collectDescendantIds,
} = require('../utils/commentTree');
const {
  processUploadedFiles,
  toPostMediaShape,
  replaceStoredMedia,
} = require('../services/mediaUploadService');
const { recordMediaAsset } = require('../services/mediaAssetService');
const {
  tenantPostScope,
  assertSameTenant,
  isPlatformUser,
  normalizeTenantId,
  denyIfCrossTenant,
  buildCollegeHomeFeedWhere,
} = require('../utils/tenantScope');
const { resolveMediaUrl } = require('../utils/resolveMediaUrl');
const { PUBLIC_BASE_PATH } = require('../config/storageConfig');
const { inferMediaType } = require('../storage/utils/fileValidation');
const {
  enrichPostsWithAcademicIdentity,
  enrichCommentsWithAcademicIdentity,
} = require('../utils/academicIdentity');
const {
  enrichUsersForNetwork,
  NETWORK_USER_ATTRS,
} = require('../utils/networkHelpers');
const {
  decoratePostRow,
  queryAmplifiesList,
  mergeFeedTimeline,
} = require('../utils/postAmplifyHelpers');

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
        attributes: ['tenant_id', 'name', 'short_name'],
        required: false,
      },
    ],
    ...overrides,
  };
}

function attachAuthorCollegeFields(plain) {
  if (!plain || typeof plain !== 'object') return plain;
  const tenant = plain.user?.tenant || plain.tenant;
  const collegeName = String(tenant?.name || tenant?.short_name || '').trim();
  if (plain.user && collegeName) {
    plain.user.college_name = collegeName;
    plain.user.tenant_name = collegeName;
  }
  if (plain.user?.tenant) {
    delete plain.user.tenant;
  }
  return plain;
}

function commentAuthorUserInclude(overrides = {}) {
  return postAuthorUserInclude({ required: false, ...overrides });
}

function enrichCommentTree(nodes) {
  (nodes || []).forEach((node) => {
    attachAuthorCollegeFields(node);
    enrichCommentTree(node.replies || []);
  });
  return nodes;
}

function enrichPostForClient(plain) {
  if (!plain || typeof plain !== 'object') return plain;
  if (Array.isArray(plain.media_urls)) {
    plain.media_urls = plain.media_urls.map((m) => {
      const item = typeof m === 'string' ? { url: m } : { ...m };
      const raw =
        item.url ||
        (item.storage_key
          ? `${PUBLIC_BASE_PATH}/${String(item.storage_key).replace(/^\/+/, '')}`
          : '');
      const url = resolveMediaUrl(raw);
      const type =
        item.type && item.type !== 'file'
          ? item.type
          : inferMediaType(item.mime_type || item.metadata?.mimetype, item.original_name || item.metadata?.originalName || raw);
      return { ...item, url, type };
    });
  }
  if (plain.user?.profile_picture) {
    plain.user.profile_picture = resolveMediaUrl(plain.user.profile_picture);
  }
  attachAuthorCollegeFields(plain);
  return plain;
}

async function clearPostMediaUrls(mediaUrls) {
  if (!Array.isArray(mediaUrls)) return;
  for (const item of mediaUrls) {
    const url = typeof item === 'string' ? item : item?.url;
    if (url) await replaceStoredMedia(url);
  }
}

async function mentionNotificationRows(mentionIds, reqUser, postId) {
  const actorLabel = [reqUser.first_name, reqUser.last_name].filter(Boolean).join(' ').trim()
    || reqUser.name
    || 'Someone';
  const rows = [];
  for (const mentionedUserId of mentionIds) {
    if (String(mentionedUserId) === String(reqUser.id)) continue;
    const ok = await NotificationService.shouldSendNotification(mentionedUserId, 'mention');
    if (!ok) continue;
    rows.push({
      user_id: mentionedUserId,
      type: 'mention',
      title: 'You were mentioned in a post',
      body: `${actorLabel} mentioned you in a post`,
      link_url: `/posts/${postId}`,
      metadata: {
        actor_id: reqUser.id,
        target_id: postId,
        entity_type: 'post',
        entity_id: postId,
      },
    });
  }
  return rows;
}

function parseMaybeJsonArray(val, fallback = []) {
  if (val == null || val === '') return fallback;
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function normalizeVisibility(visibility) {
  if (!visibility) return 'public';
  if (visibility === 'college_only') return 'college';
  if (['public', 'college', 'private'].includes(visibility)) return visibility;
  return 'public';
}

function derivePostType(typeFromBody, files) {
  let t = typeFromBody || 'text';
  if (files && files.length > 0) {
    const m = files[0].mimetype || '';
    if (m.startsWith('image/')) t = 'image';
    else if (m.startsWith('video/')) t = 'video';
  }
  const allowed = ['text', 'image', 'video', 'question', 'update', 'code'];
  if (!allowed.includes(t)) t = 'text';
  return t;
}

async function attachCommentEngagement(comments, userId) {
  const ids = [];
  const walk = (list) => {
    list.forEach((c) => {
      ids.push(c.id);
      walk(c.replies || []);
    });
  };
  walk(comments);
  if (!ids.length) return comments;

  let likedSet = new Set();
  if (userId && db.CommentLike) {
    const likes = await db.CommentLike.findAll({
      where: { comment_id: ids, user_id: userId },
      attributes: ['comment_id'],
    });
    likedSet = new Set(likes.map((l) => String(l.comment_id)));
  }

  const apply = (list) =>
    list.map((c) => ({
      ...c,
      likes_count: c.likes_count ?? 0,
      is_liked: likedSet.has(String(c.id)),
      replies: apply(c.replies || []),
    }));

  return apply(comments);
}

// Create a new post
exports.createPost = async (req, res) => {
  const {
    content,
    hashtags,
    type,
    code_language,
    code_file_name,
    visibility,
    mentioned_users
  } = req.body;
  const user_id = req.user.id;

  try {
    if (
      (content == null || !String(content).trim()) &&
      (!req.files || req.files.length === 0)
    ) {
      return res.status(400).json({
        status: false,
        message: 'Content or at least one media file is required.'
      });
    }

    const bodyContent =
      (content != null && String(content).trim()) ||
      (req.files && req.files.length ? ' ' : '');

    const tagList = parseMaybeJsonArray(hashtags, []);
    const mentionIds = parseMaybeJsonArray(mentioned_users, []);
    const vis = normalizeVisibility(visibility);
    const postType = derivePostType(type, req.files);
    const uploadedMedia = req.files?.length
      ? (await processUploadedFiles(req.files, 'post')).map(toPostMediaShape)
      : [];

    // Start a transaction
    const result = await db.sequelize.transaction(async (t) => {
      // Create the post
      const tenant_id = normalizeTenantId(req.user.tenant_id || req.tenant?.id);
      const post = await db.Post.create({
        user_id,
        tenant_id,
        content: bodyContent,
        hashtags: tagList,
        media_urls: uploadedMedia,
        type: postType,
        code_language,
        code_file_name: code_file_name ? String(code_file_name).trim().slice(0, 120) : null,
        visibility: vis
      }, { transaction: t });

      // Handle user mentions if any
      if (mentionIds.length > 0) {
        const mentions = mentionIds.map(mentionedUserId => ({
          post_id: post.id,
          mentioned_user_id: mentionedUserId
        }));

        await db.PostMention.bulkCreate(mentions, { transaction: t });

        const notifications = await mentionNotificationRows(mentionIds, req.user, post.id);
        if (notifications.length) {
          await db.Notification.bulkCreate(notifications, { transaction: t });
        }
      }

      return post;
    });

    for (const m of uploadedMedia) {
      void recordMediaAsset(m, {
        ownerId: user_id,
        tenantId: normalizeTenantId(req.user.tenant_id || req.tenant?.id),
        category: 'post',
        entityType: 'post',
        entityId: result.id,
      });
    }

    // Fetch the created post with associations
    const postWithDetails = await db.Post.findByPk(result.id, {
      include: [
        postAuthorUserInclude({ required: false }),
        {
          model: db.PostMention,
          as: 'mentions',
          include: [{
            model: db.User,
            as: 'mentionedUser',
            attributes: ['id', 'first_name', 'last_name', 'profile_picture']
          }]
        }
      ]
    });

    const plain = enrichPostForClient(
      postWithDetails.get ? postWithDetails.get({ plain: true }) : postWithDetails,
    );
    await enrichPostsWithAcademicIdentity([plain]);

    return res.status(201).json({
      status: true,
      message: 'Post created successfully.',
      data: plain,
    });
  } catch (err) {
    console.error('createPost:', err);
    const status = err.status || 500;
    return res.status(status).json({
      status: false,
      message: status === 400 ? err.message : 'Error creating post.',
      error: err.message,
    });
  }
};

/** Shared list query used by home feed and profile post tabs */
async function queryPostsList(req, { clauses, page, limit, sort }) {
  const searchNeedle = stripLikeMetacharacters(
    normalizeSearchQuery(req.query.search || req.query.q),
  );

  if (searchNeedle) {
    const tagClean = searchNeedle.replace(/^#/, '').trim() || searchNeedle;
    const contentMatch = db.sequelize.where(
      db.sequelize.fn(
        'strpos',
        db.sequelize.fn('lower', db.sequelize.col('Post.content')),
        searchNeedle.toLowerCase(),
      ),
      Op.gt,
      0,
    );
    const searchOr = [contentMatch];
    if (tagClean) {
      searchOr.push({ hashtags: { [Op.contains]: [tagClean] } });
    }
    if (searchNeedle.length <= 64) {
      searchOr.push({ code_language: { [Op.iLike]: `%${searchNeedle}%` } });
    }
    clauses.push({ [Op.or]: searchOr });
  }

  const where = clauses.length === 1 ? clauses[0] : { [Op.and]: clauses };

  let order = [];
  if (sort === 'popular') {
    order = [['likes_count', 'DESC'], ['created_at', 'DESC']];
  } else if (sort === 'trending') {
    order = [['views_count', 'DESC'], ['created_at', 'DESC']];
  } else {
    order = [['created_at', 'DESC']];
  }

  const lim = Math.min(50, parseInt(String(limit), 10) || 10);
  const pageNum = parseInt(String(page), 10) || 1;
  const off = (pageNum - 1) * lim;

  const { count, rows } = await db.Post.findAndCountAll({
    where,
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
      {
        model: db.Like,
        as: 'likes',
        required: false,
        attributes: ['user_id'],
      },
      {
        model: db.PostRepost,
        as: 'reposts',
        required: false,
        attributes: ['user_id'],
      },
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
    order,
    offset: off,
    limit: lim,
    distinct: true,
    col: 'id',
    subQuery: false,
  });

  const viewerId = req.user.id;
  const posts = rows.map((post) => {
    const plain = post.get({ plain: true });
    return decoratePostRow(plain, viewerId);
  });

  await enrichPostsWithAcademicIdentity(posts);

  return {
    posts,
    pagination: {
      total: count,
      page: pageNum,
      pages: Math.ceil(count / lim) || 1,
    },
  };
}

/** GET /api/users/:userId/posts — only posts authored by that member */
exports.getProfilePosts = async (req, res) => {
  const profileUserId = String(req.params.userId || '').trim();
  const { page = 1, limit = 20, type, hashtag, sort = 'latest' } = req.query;

  if (!profileUserId) {
    return res.status(400).json({ status: false, message: 'User id is required.' });
  }

  try {
    const targetUser = await db.User.findByPk(profileUserId, {
      attributes: ['id', 'tenant_id'],
    });
    if (!targetUser) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }

    if (
      !isPlatformUser(req.user) &&
      targetUser.tenant_id &&
      req.user.tenant_id &&
      !assertSameTenant(req.user.tenant_id, targetUser.tenant_id)
    ) {
      return res.status(403).json({ status: false, message: 'Access denied.' });
    }

    const clauses = [{ user_id: profileUserId }];
    if (!isPlatformUser(req.user) && req.user.tenant_id) {
      clauses.push(tenantPostScope(req.user.tenant_id));
    }
    const isSelf = String(req.user.id) === profileUserId;

    if (!isSelf) {
      const visibilityOr = [{ visibility: 'public' }];
      if (
        req.user.tenant_id &&
        targetUser.tenant_id &&
        String(req.user.tenant_id) === String(targetUser.tenant_id)
      ) {
        visibilityOr.push({ visibility: 'college' });
      }
      clauses.push({ [Op.or]: visibilityOr });
    }

    if (type) clauses.push({ type });
    if (hashtag) clauses.push({ hashtags: { [Op.contains]: [hashtag] } });

    const lim = Math.min(50, parseInt(String(limit), 10) || 10);
    const pageNum = parseInt(String(page), 10) || 1;
    const overLimit = lim * pageNum * 2;

    const data = await queryPostsList(req, { clauses, page: 1, limit: overLimit, sort });
    const amplifies = await queryAmplifiesList(req, { profileUserId, page: 1, limit: overLimit });
    const merged = mergeFeedTimeline(data.posts, amplifies.items, { page, limit });
    return res.status(200).json({ status: true, data: merged });
  } catch (err) {
    console.error('getProfilePosts:', err);
    return res.status(500).json({
      status: false,
      message: 'Error fetching user posts.',
      error: err.message,
    });
  }
};

// Get all posts (home feed)
exports.getPosts = async (req, res) => {
  const {
    page = 1,
    limit = 10,
    type,
    hashtag,
    user_id,
    visibility,
    sort = 'latest', // latest, popular, trending
    search,
    q,
  } = req.query;

  try {
    const profileUserId = user_id ? String(user_id).trim() : '';

    const clauses = [];

    if (type) clauses.push({ type });
    if (hashtag) clauses.push({ hashtags: { [Op.contains]: [hashtag] } });

    if (profileUserId) {
      clauses.push({ user_id: profileUserId });
      const isSelf = String(req.user.id) === profileUserId;
      if (!isSelf) {
        const targetUser = await db.User.findByPk(profileUserId, {
          attributes: ['tenant_id'],
        });
        const visibilityOr = [{ visibility: 'public' }];
        if (
          req.user.tenant_id &&
          targetUser?.tenant_id &&
          String(req.user.tenant_id) === String(targetUser.tenant_id)
        ) {
          visibilityOr.push({ visibility: 'college' });
        }
        clauses.push({ [Op.or]: visibilityOr });
      }
    } else if (visibility) {
      clauses.push({ visibility: normalizeVisibility(visibility) });
      const homeScope = buildCollegeHomeFeedWhere(req.user, { col, sqlWhere });
      if (homeScope) clauses.push(homeScope);
    } else {
      const homeScope = buildCollegeHomeFeedWhere(req.user, { col, sqlWhere });
      if (homeScope) {
        clauses.push(homeScope);
      } else {
        clauses.push({
          [Op.or]: [{ user_id: req.user.id }, { visibility: 'public' }],
        });
      }
    }

    const lim = Math.min(50, parseInt(String(limit), 10) || 10);
    const pageNum = parseInt(String(page), 10) || 1;
    const overLimit = lim * pageNum * 2;

    const data = await queryPostsList(req, { clauses, page: 1, limit: overLimit, sort });
    const amplifies = await queryAmplifiesList(req, { page: 1, limit: overLimit });
    const merged = mergeFeedTimeline(data.posts, amplifies.items, { page, limit });
    return res.status(200).json({ status: true, data: merged });
  } catch (err) {
    console.error('getPosts:', err);
    return res.status(500).json({
      status: false,
      message: 'Error fetching posts.',
      error: err.message
    });
  }
};

// Get a single post
exports.getPost = async (req, res) => {
  const { id } = req.params;

  try {
    const post = await db.Post.findByPk(id, {
      include: [
        postAuthorUserInclude({ required: false }),
        {
          model: db.PostMention,
          as: 'mentions',
          include: [{
            model: db.User,
            as: 'mentionedUser',
            attributes: ['id', 'first_name', 'last_name', 'profile_picture']
          }]
        },
        {
          model: db.Like,
          as: 'likes',
          attributes: ['user_id'],
          required: false,
        },
        {
          model: db.PostRepost,
          as: 'reposts',
          attributes: ['user_id'],
          required: false,
        },
        {
          model: db.Comment,
          as: 'comments',
          include: [{
            model: db.User,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'profile_picture']
          }]
        }
      ]
    });

    if (!post) {
      return res.status(404).json({
        status: false,
        message: 'Post not found.'
      });
    }

    const crossTenantDeny =
      denyIfCrossTenant(req, post.tenant_id) ||
      denyIfCrossTenant(req, post.user?.tenant_id);
    if (crossTenantDeny) {
      return res.status(crossTenantDeny.status).json({
        status: false,
        message: crossTenantDeny.message,
      });
    }

    // Check visibility permissions
    if (post.visibility === 'private' && post.user_id !== req.user.id) {
      return res.status(403).json({
        status: false,
        message: 'Access denied. This is a private post.'
      });
    }

    if (post.visibility === 'college' && post.user.tenant_id !== req.user.tenant_id) {
      return res.status(403).json({
        status: false,
        message: 'Access denied. This post is only visible to college members.'
      });
    }

    // Increment view count
    await post.increment('views_count');

    const plain = post.get({ plain: true });
    plain.is_liked = Array.isArray(plain.likes) && plain.likes.some((l) => l.user_id === req.user.id);
    plain.is_reposted = Array.isArray(plain.reposts) && plain.reposts.some((r) => r.user_id === req.user.id);
    const enriched = enrichPostForClient(plain);
    await enrichPostsWithAcademicIdentity([enriched]);

    return res.status(200).json({
      status: true,
      data: enriched
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching post.',
      error: err.message
    });
  }
};

// Update a post
exports.updatePost = async (req, res) => {
  const { id } = req.params;
  const {
    content,
    hashtags,
    type,
    code_language,
    code_file_name,
    visibility,
    mentioned_users
  } = req.body;
  const user_id = req.user.id;

  try {
    const post = await db.Post.findOne({
      where: { id, user_id }
    });

    if (!post) {
      return res.status(404).json({
        status: false,
        message: 'Post not found or you do not have permission to edit it.'
      });
    }

    const nextHashtags = hashtags !== undefined ? parseMaybeJsonArray(hashtags, post.hashtags) : post.hashtags;
    const nextVisibility = visibility !== undefined ? normalizeVisibility(visibility) : post.visibility;
    const nextType = type !== undefined ? derivePostType(type, req.files) : post.type;

    let nextMediaUrls = post.media_urls;
    if (req.files?.length) {
      await clearPostMediaUrls(post.media_urls);
      const uploaded = await processUploadedFiles(req.files, 'post');
      nextMediaUrls = uploaded.map(toPostMediaShape);
      for (const m of uploaded) {
        void recordMediaAsset(m, {
          ownerId: user_id,
          category: 'post',
          entityType: 'post',
          entityId: id,
        });
      }
    }

    // Start a transaction
    await db.sequelize.transaction(async (t) => {
      // Update post
      await post.update({
        content: content !== undefined ? content : post.content,
        hashtags: nextHashtags,
        media_urls: nextMediaUrls,
        type: nextType,
        code_language: code_language !== undefined ? code_language : post.code_language,
        code_file_name:
          code_file_name !== undefined
            ? (code_file_name ? String(code_file_name).trim().slice(0, 120) : null)
            : post.code_file_name,
        visibility: nextVisibility,
        updated_at: new Date()
      }, { transaction: t });

      // Update mentions if provided
      if (mentioned_users !== undefined) {
        const mentionIds = parseMaybeJsonArray(mentioned_users, []);
        await db.PostMention.destroy({
          where: { post_id: id },
          transaction: t
        });

        if (mentionIds.length > 0) {
          const mentions = mentionIds.map(mentionedUserId => ({
            post_id: id,
            mentioned_user_id: mentionedUserId
          }));

          await db.PostMention.bulkCreate(mentions, { transaction: t });

          const notifications = await mentionNotificationRows(mentionIds, req.user, id);
          if (notifications.length) {
            await db.Notification.bulkCreate(notifications, { transaction: t });
          }
        }
      }
    });

    // Fetch updated post with associations
    const updatedPost = await db.Post.findByPk(id, {
      include: [
        postAuthorUserInclude({ required: false }),
        {
          model: db.PostMention,
          as: 'mentions',
          include: [{
            model: db.User,
            as: 'mentionedUser',
            attributes: ['id', 'first_name', 'last_name', 'profile_picture']
          }]
        }
      ]
    });

    const plain = enrichPostForClient(
      updatedPost.get ? updatedPost.get({ plain: true }) : updatedPost,
    );
    await enrichPostsWithAcademicIdentity([plain]);

    return res.status(200).json({
      status: true,
      message: 'Post updated successfully.',
      data: plain,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error updating post.',
      error: err.message
    });
  }
};

// Delete a post
exports.deletePost = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const post = await db.Post.findOne({
      where: { id, user_id }
    });

    if (!post) {
      return res.status(404).json({
        status: false,
        message: 'Post not found or you do not have permission to delete it.'
      });
    }

    await clearPostMediaUrls(post.media_urls);

    // Start a transaction
    await db.sequelize.transaction(async (t) => {
      // Delete related records
      await Promise.all([
        db.PostMention.destroy({ where: { post_id: id }, transaction: t }),
        db.Like.destroy({ where: { post_id: id }, transaction: t }),
        db.PostRepost.destroy({ where: { post_id: id }, transaction: t }),
        db.Comment.destroy({ where: { post_id: id }, transaction: t })
      ]);

      // Delete the post
      await post.destroy({ transaction: t });
    });

    return res.status(200).json({
      status: true,
      message: 'Post deleted successfully.'
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error deleting post.',
      error: err.message
    });
  }
};

// Like/Unlike a post
exports.toggleLike = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const post = await db.Post.findByPk(id);

    if (!post) {
      return res.status(404).json({
        status: false,
        message: 'Post not found.'
      });
    }

    const existingLike = await db.Like.findOne({
      where: { post_id: id, user_id }
    });

    if (existingLike) {
      await existingLike.destroy();
      await post.decrement('likes_count');
      await post.reload();
      return res.status(200).json({
        status: true,
        message: 'Post unliked successfully.',
        data: {
          is_liked: false,
          likes_count: post.likes_count
        }
      });
    }

    await db.Like.create({ post_id: id, user_id });
    await post.increment('likes_count');
    await post.reload();

    if (post.user_id !== user_id) {
      const ok = await NotificationService.shouldSendNotification(post.user_id, 'like');
      if (ok) {
        const actorLabel = [req.user.first_name, req.user.last_name].filter(Boolean).join(' ').trim()
          || req.user.name
          || 'Someone';
        await db.Notification.create({
          user_id: post.user_id,
          type: 'like',
          title: 'New like on your post',
          body: `${actorLabel} liked your post`,
          link_url: `/posts/${id}`,
          metadata: {
            actor_id: user_id,
            target_id: id,
            entity_type: 'post',
            entity_id: id,
            content_preview: post.content ? String(post.content).trim().slice(0, 120) : null,
          },
        });
      }
    }

    return res.status(200).json({
      status: true,
      message: 'Post liked successfully.',
      data: {
        is_liked: true,
        likes_count: post.likes_count
      }
    });
  } catch (err) {
    console.error('toggleLike:', err);
    return res.status(500).json({
      status: false,
      message: 'Error toggling like.',
      error: err.message
    });
  }
};

async function assertPostReadable(req, postId) {
  const post = await db.Post.findByPk(postId, {
    include: [{
      model: db.User,
      as: 'user',
      attributes: ['id', 'tenant_id'],
    }],
  });

  if (!post) {
    return { error: { status: 404, message: 'Post not found.' } };
  }

  const crossTenantDeny =
    denyIfCrossTenant(req, post.tenant_id) ||
    denyIfCrossTenant(req, post.user?.tenant_id);
  if (crossTenantDeny) {
    return { error: { status: crossTenantDeny.status, message: crossTenantDeny.message } };
  }

  if (post.visibility === 'private' && post.user_id !== req.user.id) {
    return { error: { status: 403, message: 'Access denied. This is a private post.' } };
  }

  if (post.visibility === 'college' && post.user?.tenant_id !== req.user.tenant_id) {
    return { error: { status: 403, message: 'Access denied. This post is only visible to college members.' } };
  }

  return { post };
}

function formatEngagementUserShape(user, extras = {}) {
  const profilePicture = resolveMediaUrl(user.profile_picture);
  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User',
    profile_picture: profilePicture,
    avatar_url: profilePicture,
    user_type: user.user_type,
    college_name: user.college_name || null,
    academic_identity: user.academic_identity || null,
    professional_identity: user.professional_identity || null,
    company: user.company || null,
    position: user.position || null,
    degree: user.degree || null,
    branch: user.branch || null,
    department: user.department || null,
    academic_year: user.academic_year || null,
    graduation_batch: user.graduation_batch || null,
    designation: user.designation || null,
    is_following: Boolean(user.is_following),
    ...extras,
  };
}

/** GET /api/posts/:id/likes — paginated list of users who liked a post */
exports.getPostLikes = async (req, res) => {
  const { id } = req.params;
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
  const offset = (page - 1) * limit;

  try {
    const access = await assertPostReadable(req, id);
    if (access.error) {
      return res.status(access.error.status).json({ status: false, message: access.error.message });
    }

    const { count, rows } = await db.Like.findAndCountAll({
      where: { post_id: id },
      include: [{
        model: db.User,
        as: 'user',
        attributes: NETWORK_USER_ATTRS,
        required: true,
      }],
      order: [['id', 'DESC']],
      limit,
      offset,
    });

    const users = rows.map((row) => row.user).filter(Boolean);
    const enriched = await enrichUsersForNetwork(req.user.id, users, { includeMutual: false });
    const items = enriched.map((u) => formatEngagementUserShape(u));

    return res.status(200).json({
      status: true,
      data: {
        users: items,
        pagination: {
          total: count,
          page,
          pages: Math.ceil(count / limit) || 1,
          limit,
        },
      },
    });
  } catch (err) {
    console.error('getPostLikes:', err);
    return res.status(500).json({
      status: false,
      message: 'Error fetching post likes.',
      error: err.message,
    });
  }
};

/** GET /api/posts/:id/reposts — paginated list of users who reposted a post */
exports.getPostReposts = async (req, res) => {
  const { id } = req.params;
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
  const offset = (page - 1) * limit;

  try {
    const access = await assertPostReadable(req, id);
    if (access.error) {
      return res.status(access.error.status).json({ status: false, message: access.error.message });
    }

    const { count, rows } = await db.PostRepost.findAndCountAll({
      where: { post_id: id },
      include: [{
        model: db.User,
        as: 'user',
        attributes: NETWORK_USER_ATTRS,
        required: true,
      }],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    const users = rows.map((row) => {
      const plain = row.get({ plain: true });
      return plain.user || null;
    }).filter(Boolean);

    const repostedAtByUserId = new Map(
      rows.map((row) => {
        const plain = row.get({ plain: true });
        return plain.user ? [String(plain.user.id), plain.created_at] : null;
      }).filter(Boolean),
    );

    const enriched = await enrichUsersForNetwork(req.user.id, users, { includeMutual: false });
    const items = enriched.map((u) => formatEngagementUserShape(u, {
      reposted_at: repostedAtByUserId.get(String(u.id)) || null,
    }));

    return res.status(200).json({
      status: true,
      data: {
        users: items,
        pagination: {
          total: count,
          page,
          pages: Math.ceil(count / limit) || 1,
          limit,
        },
      },
    });
  } catch (err) {
    console.error('getPostReposts:', err);
    return res.status(500).json({
      status: false,
      message: 'Error fetching post reposts.',
      error: err.message,
    });
  }
};

/** POST /api/posts/:id/repost — amplify a post once per user; remove via { remove: true } */
exports.toggleRepost = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;
  const amplifyComment =
    req.body?.amplify_comment ??
    req.body?.comment ??
    null;
  const remove = Boolean(req.body?.remove);

  try {
    const access = await assertPostReadable(req, id);
    if (access.error) {
      return res.status(access.error.status).json({ status: false, message: access.error.message });
    }

    const post = access.post;
    const existing = await db.PostRepost.findOne({
      where: { post_id: id, user_id },
    });

    if (existing && remove) {
      await existing.destroy();
      if (post.reposts_count > 0) {
        await post.decrement('reposts_count');
      }
      await post.reload();
      if (post.reposts_count < 0) {
        await post.update({ reposts_count: 0 });
        await post.reload();
      }
      return res.status(200).json({
        status: true,
        message: 'Amplify removed successfully.',
        data: {
          is_reposted: false,
          is_amplified: false,
          reposts_count: post.reposts_count,
          amplifies_count: post.reposts_count,
        },
      });
    }

    if (existing) {
      return res.status(409).json({
        status: false,
        code: 'DUPLICATE_AMPLIFY',
        message: 'You have already amplified this post.',
        data: {
          is_reposted: true,
          is_amplified: true,
          reposts_count: post.reposts_count,
          amplifies_count: post.reposts_count,
          amplify_id: existing.id,
        },
      });
    }

    let amplify;
    try {
      amplify = await db.PostRepost.create({
        post_id: id,
        user_id,
        amplify_comment: amplifyComment != null ? String(amplifyComment).trim() || null : null,
      });
    } catch (createErr) {
      const isUnique =
        createErr?.name === 'SequelizeUniqueConstraintError' ||
        String(createErr?.message || '').includes('unique') ||
        String(createErr?.parent?.constraint || '').includes('post_id');
      if (isUnique) {
        return res.status(409).json({
          status: false,
          code: 'DUPLICATE_AMPLIFY',
          message: 'You have already amplified this post.',
        });
      }
      throw createErr;
    }

    await post.increment('reposts_count');
    await post.reload();

    if (post.user_id !== user_id) {
      const ok = await NotificationService.shouldSendNotification(post.user_id, 'post_share');
      if (ok) {
        const actorLabel = [req.user.first_name, req.user.last_name].filter(Boolean).join(' ').trim()
          || req.user.name
          || 'Someone';
        const preview = amplify.amplify_comment || post.content;
        await db.Notification.create({
          user_id: post.user_id,
          type: 'post_share',
          title: 'Your post was amplified',
          body: `${actorLabel} amplified your post`,
          link_url: `/posts/${id}`,
          metadata: {
            actor_id: user_id,
            target_id: id,
            entity_type: 'post',
            entity_id: id,
            amplify_id: amplify.id,
            content_preview: preview ? String(preview).trim().slice(0, 120) : null,
          },
        });
      }
    }

    return res.status(200).json({
      status: true,
      message: 'Post amplified successfully.',
      data: {
        is_reposted: true,
        is_amplified: true,
        reposts_count: post.reposts_count,
        amplifies_count: post.reposts_count,
        amplify_comment: amplify.amplify_comment,
        amplify_id: amplify.id,
      },
    });
  } catch (err) {
    console.error('toggleRepost:', err);
    return res.status(500).json({
      status: false,
      message: 'Error amplifying post.',
      error: err.message,
    });
  }
};

// Add a comment to a post
exports.addComment = async (req, res) => {
  const { id } = req.params;
  const { text, parent_comment_id } = req.body;
  const user_id = req.user.id;

  try {
    const cleanText = sanitizeCommentText(text);
    if (!cleanText) {
      return res.status(400).json({
        status: false,
        message: 'Comment text is required.'
      });
    }

    const post = await db.Post.findByPk(id, { attributes: ['id', 'user_id', 'tenant_id'] });

    if (!post) {
      return res.status(404).json({
        status: false,
        message: 'Post not found.'
      });
    }

    const postDenial = denyIfCrossTenant(req, post.tenant_id);
    if (postDenial) {
      return res.status(postDenial.status).json({ status: false, message: postDenial.message });
    }

    let parentComment = null;
    if (parent_comment_id) {
      parentComment = await db.Comment.findOne({
        where: { id: parent_comment_id, post_id: id },
      });
      if (!parentComment) {
        return res.status(404).json({
          status: false,
          message: 'Parent comment not found for this post.',
        });
      }
    }

    const comment = await db.Comment.create({
      post_id: id,
      user_id,
      tenant_id: post.tenant_id || normalizeTenantId(req.user.tenant_id),
      text: cleanText,
      parent_comment_id: parentComment ? parentComment.id : null,
    });

    await post.increment('comments_count');

    const notificationTarget = parentComment ? parentComment.user_id : post.user_id;
    if (notificationTarget !== user_id) {
      const ok = await NotificationService.shouldSendNotification(notificationTarget, 'comment');
      if (ok) {
        const actorLabel = [req.user.first_name, req.user.last_name].filter(Boolean).join(' ').trim()
          || req.user.name
          || 'Someone';
        await NotificationService.persistNotification({
          user_id: notificationTarget,
          type: 'comment',
          title: parentComment ? 'New reply to your comment' : 'New comment on your post',
          body: parentComment
            ? `${actorLabel} replied to your comment`
            : `${actorLabel} commented on your post`,
          link_url: parentComment
            ? `/posts/${id}#comment-${comment.id}`
            : `/posts/${id}#comment-${comment.id}`,
          metadata: {
            actor_id: user_id,
            target_id: id,
            entity_type: 'post',
            entity_id: id,
            comment_id: comment.id,
            parent_comment_id: parentComment ? parentComment.id : null,
            content_preview: cleanText ? String(cleanText).trim().slice(0, 120) : null,
          },
        });
      }
    }

    // Fetch comment with user details
    const commentWithUser = await db.Comment.findByPk(comment.id, {
      include: [commentAuthorUserInclude()],
    });
    const plain = commentWithUser.get({ plain: true });
    enrichCommentTree([plain]);
    await enrichCommentsWithAcademicIdentity([plain]);

    return res.status(201).json({
      status: true,
      message: 'Comment added successfully.',
      data: plain,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error adding comment.',
      error: err.message
    });
  }
};

// Get post comments with pagination & sorting
exports.getComments = async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 20, sort = 'latest' } = req.query;

  try {
    const lim = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 20));
    const pg = Math.max(1, parseInt(String(page), 10) || 1);
    const sortMode = ['latest', 'oldest', 'top'].includes(String(sort)) ? String(sort) : 'latest';

    const post = await db.Post.findByPk(id, { attributes: ['id', 'tenant_id'] });
    if (!post) {
      return res.status(404).json({ status: false, message: 'Post not found.' });
    }
    const postDenial = denyIfCrossTenant(req, post.tenant_id);
    if (postDenial) {
      return res.status(postDenial.status).json({ status: false, message: postDenial.message });
    }

    const rows = await db.Comment.findAll({
      where: { post_id: id },
      include: [commentAuthorUserInclude()],
      order: [['created_at', 'ASC']],
      limit: 500,
    });

    const { roots } = buildCommentTree(rows);
    const sorted = sortRootComments(roots, sortMode);
    const start = (pg - 1) * lim;
    const paged = sorted.slice(start, start + lim);
    const withEngagement = await attachCommentEngagement(paged, req.user.id);
    enrichCommentTree(withEngagement);
    await enrichCommentsWithAcademicIdentity(withEngagement);

    return res.status(200).json({
      status: true,
      data: {
        comments: withEngagement,
        sort: sortMode,
        pagination: {
          total: sorted.length,
          page: pg,
          pages: Math.ceil(sorted.length / lim) || 1,
          limit: lim,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching comments.',
      error: err.message,
    });
  }
};

// Update a comment (author only)
exports.updateComment = async (req, res) => {
  const { id: postId, commentId } = req.params;
  const user_id = req.user.id;
  const cleanText = sanitizeCommentText(req.body?.text ?? req.body?.content);

  try {
    if (!cleanText) {
      return res.status(400).json({ status: false, message: 'Comment text is required.' });
    }

    const comment = await db.Comment.findOne({
      where: { id: commentId, post_id: postId },
    });
    if (!comment) {
      return res.status(404).json({ status: false, message: 'Comment not found.' });
    }
    if (String(comment.user_id) !== String(user_id)) {
      return res.status(403).json({ status: false, message: 'You can only edit your own comments.' });
    }

    comment.text = cleanText;
    comment.updated_at = new Date();
    await comment.save();

    const commentWithUser = await db.Comment.findByPk(comment.id, {
      include: [commentAuthorUserInclude()],
    });

    const plainComment = commentWithUser.get({ plain: true });
    enrichCommentTree([plainComment]);
    const [enriched] = await attachCommentEngagement([{ ...plainComment, replies: [] }], user_id);
    await enrichCommentsWithAcademicIdentity([enriched]);

    return res.status(200).json({
      status: true,
      message: 'Comment updated successfully.',
      data: enriched,
    });
  } catch (err) {
    console.error('updateComment:', err);
    return res.status(500).json({
      status: false,
      message: 'Error updating comment.',
      error: err.message,
    });
  }
};

// Toggle like on a comment
exports.toggleCommentLike = async (req, res) => {
  const { id: postId, commentId } = req.params;
  const user_id = req.user.id;

  try {
    const comment = await db.Comment.findOne({
      where: { id: commentId, post_id: postId },
    });
    if (!comment) {
      return res.status(404).json({ status: false, message: 'Comment not found.' });
    }

    if (!db.CommentLike) {
      return res.status(501).json({ status: false, message: 'Comment likes are not available.' });
    }

    const existing = await db.CommentLike.findOne({
      where: { comment_id: commentId, user_id },
    });

    let is_liked;
    if (existing) {
      await existing.destroy();
      await comment.decrement('likes_count', { by: 1 });
      is_liked = false;
    } else {
      await db.CommentLike.create({ comment_id: commentId, user_id });
      await comment.increment('likes_count', { by: 1 });
      is_liked = true;
    }

    await comment.reload();

    return res.status(200).json({
      status: true,
      data: {
        is_liked,
        likes_count: Math.max(0, comment.likes_count || 0),
      },
    });
  } catch (err) {
    console.error('toggleCommentLike:', err);
    return res.status(500).json({
      status: false,
      message: 'Error toggling comment like.',
      error: err.message,
    });
  }
};

// Delete a comment on a post (author of comment or post owner)
exports.deleteComment = async (req, res) => {
  const { id: postId, commentId } = req.params;
  const user_id = req.user.id;

  try {
    const comment = await db.Comment.findOne({
      where: { id: commentId, post_id: postId },
      include: [
        {
          model: db.Post,
          as: 'post',
          attributes: ['id', 'user_id'],
        },
      ],
    });

    if (!comment) {
      return res.status(404).json({
        status: false,
        message: 'Comment not found.',
      });
    }

    const postOwnerId = comment.post ? comment.post.user_id : null;
    const isCommentAuthor = comment.user_id === user_id;
    const isPostOwner = postOwnerId === user_id;

    if (!isCommentAuthor && !isPostOwner) {
      return res.status(403).json({
        status: false,
        message: 'You do not have permission to delete this comment.',
      });
    }

    const allPostComments = await db.Comment.findAll({
      where: { post_id: postId },
      attributes: ['id', 'parent_comment_id'],
    });
    const idsToRemove = collectDescendantIds(allPostComments, comment.id);

    await db.sequelize.transaction(async (t) => {
      await db.Comment.destroy({
        where: { id: idsToRemove },
        transaction: t,
      });
      await db.Post.decrement('comments_count', {
        by: Math.max(1, idsToRemove.length),
        where: { id: postId },
        transaction: t,
      });
    });

    return res.status(200).json({
      status: true,
      message: 'Comment deleted successfully.',
    });
  } catch (err) {
    console.error('deleteComment:', err);
    return res.status(500).json({
      status: false,
      message: 'Error deleting comment.',
      error: err.message,
    });
  }
};

// Get trending hashtags
exports.getTrendingHashtags = async (req, res) => {
  try {
    const homeScope = buildCollegeHomeFeedWhere(req.user, { col, sqlWhere });
    const baseWhere = { hashtags: { [Op.ne]: [] } };
    const where = homeScope ? { [Op.and]: [baseWhere, homeScope] } : baseWhere;

    const posts = await db.Post.findAll({
      attributes: ['hashtags'],
      where,
      include: homeScope
        ? [
            {
              model: db.User,
              as: 'user',
              attributes: ['id', 'tenant_id'],
              required: true,
            },
          ]
        : [],
    });

    // Count hashtag occurrences
    const tagCount = {};
    posts.forEach(post => {
      post.hashtags.forEach(tag => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    });

    // Sort tags by frequency
    const trendingTags = Object.entries(tagCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));

    return res.status(200).json({
      status: true,
      data: trendingTags
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching trending hashtags.',
      error: err.message
    });
  }
};