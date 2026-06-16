const { Op } = require('sequelize');
const db = require('../database/index');
const { resolveMediaUrl } = require('./resolveMediaUrl');
const { buildNotificationNavigation } = require('./notificationNavigation');
const { enrichCommentIdsForNotifications } = require('./notificationTargetResolver');

const PREVIEW_TYPES = new Set(['like', 'comment', 'post_like', 'post_comment', 'mention', 'post_share', 'post_mention']);

function buildActorName(user) {
  if (!user) return null;
  const plain = user.get ? user.get({ plain: true }) : user;
  const name = [plain.first_name, plain.last_name].filter(Boolean).join(' ').trim();
  return name || null;
}

function parseActorNameFromBody(body) {
  if (!body || typeof body !== 'string') return null;
  const match = body.match(
    /^(.+?)\s+(liked|commented|replied|mentioned|started following|sent you|shared|applied|endorsed|answered|invited you)/i,
  );
  return match ? match[1].trim() : null;
}

function formatActor(user) {
  const plain = user.get ? user.get({ plain: true }) : user;
  return {
    id: plain.id,
    name: buildActorName(plain) || 'User',
    avatar_url: plain.profile_picture ? resolveMediaUrl(plain.profile_picture) : null,
    user_type: plain.user_type || null,
  };
}

function trimPreview(text, max = 120) {
  if (!text) return null;
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

async function loadPostPreviews(notifications) {
  const postIds = [
    ...new Set(
      notifications
        .filter((n) => {
          const meta = n.metadata || {};
          const hasPreview = meta.content_preview || meta.message_preview || meta.post_preview;
          const targetId = meta.target_id;
          return !hasPreview && targetId && PREVIEW_TYPES.has(n.type);
        })
        .map((n) => n.metadata.target_id)
        .filter(Boolean)
        .map(String),
    ),
  ];

  if (postIds.length === 0) return new Map();

  const posts = await db.Post.findAll({
    where: { id: { [Op.in]: postIds } },
    attributes: ['id', 'content'],
  });

  return new Map(
    posts.map((p) => {
      const plain = p.get ? p.get({ plain: true }) : p;
      return [String(plain.id), trimPreview(plain.content)];
    }),
  );
}

async function loadCommentPreviews(notifications) {
  const needsCommentText = notifications.filter((n) => {
    const type = n.type;
    const meta = n.metadata || {};
    const hasPreview = meta.content_preview || meta.message_preview;
    return (type === 'comment' || type === 'post_comment') && !hasPreview;
  });

  if (needsCommentText.length === 0) return new Map();

  const postIds = [...new Set(needsCommentText.map((n) => n.metadata?.target_id).filter(Boolean))];
  const actorIds = [...new Set(needsCommentText.map((n) => n.metadata?.actor_id).filter(Boolean))];

  if (postIds.length === 0 || actorIds.length === 0) return new Map();

  const comments = await db.Comment.findAll({
    where: {
      post_id: { [Op.in]: postIds },
      user_id: { [Op.in]: actorIds },
    },
    attributes: ['post_id', 'user_id', 'text', 'created_at'],
    order: [['created_at', 'DESC']],
    limit: 200,
  });

  const map = new Map();
  for (const c of comments) {
    const plain = c.get ? c.get({ plain: true }) : c;
    const key = `${plain.post_id}:${plain.user_id}`;
    if (!map.has(key)) map.set(key, trimPreview(plain.text));
  }
  return map;
}

/**
 * Batch-load actors and contextual previews for notification rows.
 * Presentation-only enrichment — does not alter notification logic.
 */
async function enrichNotificationsWithActors(notifications) {
  if (!Array.isArray(notifications) || notifications.length === 0) return notifications;

  const withCommentIds = await enrichCommentIdsForNotifications(notifications);

  const actorIds = [
    ...new Set(
      withCommentIds
        .map((n) => n.metadata?.actor_id)
        .filter(Boolean)
        .map(String),
    ),
  ];

  const [users, postPreviewMap, commentPreviewMap] = await Promise.all([
    actorIds.length > 0
      ? db.User.findAll({
          where: { id: { [Op.in]: actorIds } },
          attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'user_type'],
        })
      : [],
    loadPostPreviews(withCommentIds),
    loadCommentPreviews(withCommentIds),
  ]);

  const actorMap = new Map(users.map((u) => [String(u.id), formatActor(u)]));

  return withCommentIds.map((n) => {
    const meta = n.metadata && typeof n.metadata === 'object' ? n.metadata : {};
    const actorId = meta.actor_id != null ? String(meta.actor_id) : null;
    const resolved = actorId ? actorMap.get(actorId) : null;
    const fallbackName = parseActorNameFromBody(n.body) || meta.actor_name || null;

    let actor = resolved;
    if (!actor && (actorId || fallbackName)) {
      actor = {
        id: actorId,
        name: fallbackName || 'Someone',
        avatar_url: meta.actor_avatar ? resolveMediaUrl(meta.actor_avatar) : null,
        user_type: meta.actor_user_type || null,
      };
    }

    let contentPreview =
      meta.content_preview || meta.message_preview || meta.post_preview || null;

    if (!contentPreview && meta.target_id) {
      const targetKey = String(meta.target_id);
      if (n.type === 'comment' || n.type === 'post_comment') {
        contentPreview = commentPreviewMap.get(`${targetKey}:${actorId}`) || postPreviewMap.get(targetKey) || null;
      } else if (PREVIEW_TYPES.has(n.type)) {
        contentPreview = postPreviewMap.get(targetKey) || null;
      }
    }

    return {
      ...n,
      actor: actor || null,
      content_preview: contentPreview,
      target_id: meta.target_id || null,
      navigation: buildNotificationNavigation({ ...n, metadata: meta }),
    };
  });
}

module.exports = {
  enrichNotificationsWithActors,
  parseActorNameFromBody,
};
