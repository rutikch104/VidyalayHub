const db = require('../database/index');
const { Op } = require('sequelize');
const { buildNotificationNavigation, canonicalNotificationType } = require('./notificationNavigation');

async function entityExists(navigation) {
  if (!navigation?.entity_type) return true;

  try {
    switch (navigation.entity_type) {
      case 'post': {
        if (!navigation.post_id && !navigation.entity_id) return false;
        const id = navigation.post_id || navigation.entity_id;
        const row = await db.Post.findByPk(id, { attributes: ['id'] });
        return Boolean(row);
      }
      case 'community':
      case 'community_post': {
        const communityId = navigation.community_id;
        if (!communityId) return false;
        const community = await db.Community.findByPk(communityId, { attributes: ['id'] });
        if (!community) return false;
        if (navigation.entity_type === 'community' || !navigation.post_id) return true;
        const post = await db.CommunityPost.findOne({
          where: { id: navigation.post_id, community_id: communityId },
          attributes: ['id'],
        });
        return Boolean(post);
      }
      case 'event': {
        const id = navigation.event_id || navigation.entity_id;
        if (!id) return false;
        const row = await db.Event.findByPk(id, { attributes: ['id'] });
        return Boolean(row);
      }
      case 'question': {
        const id = navigation.question_id || navigation.entity_id;
        if (!id) return false;
        const row = await db.GlobalQuestion.findByPk(id, { attributes: ['id'] });
        return Boolean(row);
      }
      case 'profile': {
        const id = navigation.actor_id || navigation.entity_id;
        if (!id) return false;
        const row = await db.User.findByPk(id, { attributes: ['id', 'is_approved'] });
        return Boolean(row && row.is_approved);
      }
      case 'thread': {
        const id = navigation.thread_id || navigation.entity_id;
        if (!id) return false;
        const row = await db.MessageThread.findByPk(id, { attributes: ['id'] });
        return Boolean(row);
      }
      case 'connection':
        return true;
      case 'notice': {
        const id = navigation.notice_id || navigation.entity_id;
        if (!id) return false;
        const row = await db.TenantNotice.findByPk(id, { attributes: ['id', 'is_archived'] });
        return Boolean(row && !row.is_archived);
      }
      default:
        return true;
    }
  } catch {
    return false;
  }
}

async function resolveNotificationTarget(notification) {
  const navigation = buildNotificationNavigation(notification);
  const available = await entityExists(navigation);
  return { navigation, available };
}

async function enrichCommentIdsForNotifications(notifications) {
  const needsLookup = notifications.filter((n) => {
    const type = canonicalNotificationType(n.type);
    if (type !== 'comment') return false;
    const meta = n.metadata || {};
    return !meta.comment_id && meta.target_id && meta.actor_id;
  });

  if (needsLookup.length === 0) return notifications;

  const pairs = needsLookup.map((n) => ({
    post_id: n.metadata.target_id,
    user_id: n.metadata.actor_id,
  }));

  const postIds = [...new Set(pairs.map((p) => p.post_id))];
  const actorIds = [...new Set(pairs.map((p) => p.user_id))];

  const comments = await db.Comment.findAll({
    where: {
      post_id: { [Op.in]: postIds },
      user_id: { [Op.in]: actorIds },
    },
    attributes: ['id', 'post_id', 'user_id', 'parent_comment_id', 'created_at'],
    order: [['created_at', 'DESC']],
    limit: 300,
  });

  const map = new Map();
  for (const c of comments) {
    const plain = c.get ? c.get({ plain: true }) : c;
    const key = `${plain.post_id}:${plain.user_id}`;
    if (!map.has(key)) map.set(key, plain);
  }

  return notifications.map((n) => {
    const type = canonicalNotificationType(n.type);
    if (type !== 'comment') return n;
    const meta = n.metadata || {};
    if (meta.comment_id) return n;
    const key = `${meta.target_id}:${meta.actor_id}`;
    const match = map.get(key);
    if (!match) return n;
    return {
      ...n,
      metadata: {
        ...meta,
        comment_id: match.id,
        parent_comment_id: match.parent_comment_id || null,
        entity_type: 'post',
      },
    };
  });
}

module.exports = {
  resolveNotificationTarget,
  enrichCommentIdsForNotifications,
  entityExists,
};
