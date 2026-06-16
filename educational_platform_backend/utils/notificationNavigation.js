const CANONICAL_TYPES = {
  post_like: 'like',
  post_comment: 'comment',
  post_mention: 'mention',
  question_answer: 'answer',
  question_answered: 'answer',
  question_mention: 'mention',
  question_liked: 'like',
  question_comment: 'comment',
};

function canonicalNotificationType(type) {
  return CANONICAL_TYPES[type] || type;
}

function parseHashFromLink(linkUrl) {
  if (!linkUrl || typeof linkUrl !== 'string') return '';
  const idx = linkUrl.indexOf('#');
  return idx >= 0 ? linkUrl.slice(idx + 1) : '';
}

function parseLinkUrlNavigation(linkUrl, base = {}) {
  if (!linkUrl || typeof linkUrl !== 'string') {
    return { ...base, page: base.page || null };
  }

  const path = linkUrl.replace(/^\//, '').split('#')[0];
  const hash = parseHashFromLink(linkUrl);
  const parts = path.split('/').filter(Boolean);

  if (parts[0] === 'posts' && parts[1]) {
    const commentMatch = hash.match(/^comment-(.+)$/);
    return {
      ...base,
      page: 'home',
      entity_type: 'post',
      entity_id: parts[1],
      post_id: parts[1],
      comment_id: commentMatch ? commentMatch[1] : base.comment_id || null,
      open_comments: Boolean(commentMatch || base.open_comments),
    };
  }

  if (parts[0] === 'profile' && parts[1]) {
    return {
      ...base,
      page: 'profile',
      entity_type: 'profile',
      entity_id: parts[1],
      actor_id: parts[1],
    };
  }

  if (parts[0] === 'communities' && parts[1]) {
    const postId = parts[2] === 'posts' ? parts[3] : null;
    const commentMatch = hash.match(/^comment-(.+)$/);
    return {
      ...base,
      page: 'communities',
      entity_type: postId ? 'community_post' : 'community',
      entity_id: postId || parts[1],
      community_id: parts[1],
      post_id: postId,
      comment_id: commentMatch ? commentMatch[1] : base.comment_id || null,
      open_comments: Boolean(commentMatch || postId),
    };
  }

  if (parts[0] === 'events' && parts[1]) {
    return {
      ...base,
      page: 'events',
      entity_type: 'event',
      entity_id: parts[1],
      event_id: parts[1],
    };
  }

  if (parts[0] === 'questions' && parts[1]) {
    const answerMatch = hash.match(/^answer-(.+)$/);
    return {
      ...base,
      page: 'teacher',
      entity_type: 'question',
      entity_id: parts[1],
      question_id: parts[1],
      answer_id: answerMatch ? answerMatch[1] : base.answer_id || null,
      open_comments: Boolean(answerMatch),
    };
  }

  if (parts[0] === 'connections') {
    return {
      ...base,
      page: 'network',
      entity_type: 'connection',
      network_tab: parts[1] === 'pending' ? 'pending' : 'connections',
    };
  }

  if (parts[0] === 'messages') {
    const threadId = parts[1] === 'threads' ? parts[2] : null;
    return {
      ...base,
      page: 'messages',
      entity_type: 'thread',
      entity_id: threadId,
      thread_id: threadId,
    };
  }

  if (parts[0] === 'jobs') {
    return {
      ...base,
      page: 'jobs',
      entity_type: 'job',
      entity_id: parts[2] || parts[1] || null,
    };
  }

  if (parts[0] === 'notices' && parts[1]) {
    return {
      ...base,
      page: 'home',
      entity_type: 'notice',
      entity_id: parts[1],
      notice_id: parts[1],
    };
  }

  return { ...base, page: base.page || null, link_url: linkUrl };
}

function buildNotificationNavigation(notification) {
  const meta =
    notification?.metadata && typeof notification.metadata === 'object'
      ? notification.metadata
      : {};
  const type = canonicalNotificationType(notification?.type);
  const actorId = meta.actor_id || notification?.actor?.id || null;
  const linkUrl = notification?.link_url || '';

  const base = {
    type,
    entity_type: meta.entity_type || null,
    entity_id: meta.entity_id || meta.target_id || null,
    actor_id: actorId != null ? String(actorId) : null,
    comment_id: meta.comment_id != null ? String(meta.comment_id) : null,
    parent_comment_id: meta.parent_comment_id != null ? String(meta.parent_comment_id) : null,
    community_id: meta.community_id != null ? String(meta.community_id) : null,
    post_id: meta.post_id != null ? String(meta.post_id) : null,
    thread_id: meta.thread_id != null ? String(meta.thread_id) : null,
    event_id: meta.event_id != null ? String(meta.event_id) : meta.eventId != null ? String(meta.eventId) : null,
    question_id: meta.question_id != null ? String(meta.question_id) : null,
    answer_id: meta.answer_id != null ? String(meta.answer_id) : null,
    notice_id: meta.notice_id != null ? String(meta.notice_id) : null,
    connection_id: meta.connection_id != null ? String(meta.connection_id) : meta.target_id != null ? String(meta.target_id) : null,
    network_tab: null,
    open_comments: false,
    highlight: true,
    link_url: linkUrl,
    page: null,
  };

  if (!base.post_id && base.entity_type === 'post' && base.entity_id) {
    base.post_id = String(base.entity_id);
  }
  if (!base.question_id && type === 'answer' && meta.target_id) {
    base.question_id = String(meta.target_id);
  }
  if (!base.event_id && type === 'event_reminder') {
    base.event_id = meta.eventId != null ? String(meta.eventId) : meta.event_id != null ? String(meta.event_id) : null;
  }

  if (type === 'connection_request' && meta.status === 'accepted') {
    return {
      ...base,
      page: 'profile',
      entity_type: 'profile',
      entity_id: base.actor_id,
    };
  }

  switch (type) {
    case 'like':
    case 'post_share':
      return {
        ...parseLinkUrlNavigation(linkUrl, base),
        page: 'home',
        entity_type: 'post',
        entity_id: base.post_id || meta.target_id,
        post_id: base.post_id || (meta.target_id != null ? String(meta.target_id) : null),
        open_comments: false,
      };
    case 'comment':
      return {
        ...parseLinkUrlNavigation(linkUrl, base),
        page: 'home',
        entity_type: 'post',
        entity_id: base.post_id || meta.target_id,
        post_id: base.post_id || (meta.target_id != null ? String(meta.target_id) : null),
        comment_id: base.comment_id,
        parent_comment_id: base.parent_comment_id,
        open_comments: true,
      };
    case 'mention':
      return {
        ...parseLinkUrlNavigation(linkUrl, base),
        page: meta.community_id ? 'communities' : 'home',
        entity_type: meta.community_id ? 'community_post' : 'post',
        community_id: base.community_id,
        post_id: base.post_id || (meta.post_id != null ? String(meta.post_id) : meta.target_id != null ? String(meta.target_id) : null),
        comment_id: base.comment_id,
        open_comments: true,
      };
    case 'follow':
      return {
        ...base,
        page: 'profile',
        entity_type: 'profile',
        entity_id: base.actor_id,
      };
    case 'connection_request':
      return {
        ...parseLinkUrlNavigation(linkUrl, base),
        page: 'network',
        entity_type: 'connection',
        entity_id: base.connection_id,
        network_tab: 'pending',
      };
    case 'message':
    case 'group_invite':
      return {
        ...parseLinkUrlNavigation(linkUrl, base),
        page: 'messages',
        entity_type: 'thread',
        entity_id: base.thread_id,
        thread_id: base.thread_id,
      };
    case 'answer':
      return {
        ...parseLinkUrlNavigation(linkUrl, base),
        page: 'teacher',
        entity_type: 'question',
        entity_id: base.question_id || meta.target_id,
        question_id: base.question_id || (meta.target_id != null ? String(meta.target_id) : null),
        answer_id: base.answer_id,
        open_comments: Boolean(base.answer_id),
      };
    case 'event_reminder':
      return {
        ...parseLinkUrlNavigation(linkUrl, base),
        page: 'events',
        entity_type: 'event',
        entity_id: base.event_id,
        event_id: base.event_id,
      };
    case 'job_application':
      return {
        ...parseLinkUrlNavigation(linkUrl, base),
        page: 'jobs',
        entity_type: 'job_application',
        entity_id: base.entity_id || meta.target_id,
      };
    case 'endorsement':
    case 'skill_endorsement':
      return {
        ...base,
        page: 'profile',
        entity_type: 'profile',
        entity_id: base.actor_id,
      };
    default:
      return parseLinkUrlNavigation(linkUrl, base);
  }
}

module.exports = {
  canonicalNotificationType,
  buildNotificationNavigation,
  parseLinkUrlNavigation,
};
