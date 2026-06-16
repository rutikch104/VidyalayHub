/** Session keys used to pass deep-link intent between pages. */
export const NOTIF_NAV_KEYS = {
  POST_ID: 'notif_nav_post_id',
  HIGHLIGHT_POST: 'notif_nav_highlight_post',
  COMMENT_ID: 'notif_nav_comment_id',
  HIGHLIGHT_COMMENT: 'notif_nav_highlight_comment',
  OPEN_COMMENTS: 'notif_nav_open_comments',
  NETWORK_TAB: 'notif_nav_network_tab',
  PROFILE_USER_ID: 'notif_nav_profile_user_id',
  EVENT_ID: 'notif_nav_event_id',
  COMMUNITY_ID: 'notif_nav_community_id',
  COMMUNITY_POST_ID: 'notif_nav_community_post_id',
  COMMUNITY_COMMENT_ID: 'notif_nav_community_comment_id',
  THREAD_ID: 'notif_nav_thread_id',
  MESSAGE_USER_ID: 'notif_nav_message_user_id',
  QUESTION_ID: 'notif_nav_question_id',
  ANSWER_ID: 'notif_nav_answer_id',
  HIGHLIGHT_ANSWER: 'notif_nav_highlight_answer',
  NOTICE_ID: 'notif_nav_notice_id',
  JOBS_PREFILL: 'notif_nav_jobs_prefill',
};

const UNAVAILABLE_MESSAGE = 'Content no longer available.';

function clearNotifNavKeys() {
  Object.values(NOTIF_NAV_KEYS).forEach((key) => sessionStorage.removeItem(key));
}

function write(key, value) {
  if (value == null || value === '') return;
  sessionStorage.setItem(key, String(value));
}

export function resolveClientNavigation(notification) {
  if (notification?.navigation?.page) {
    return notification.navigation;
  }

  const meta = notification?.metadata || {};
  const link = notification?.link_url || '';
  const type = notification?.type || '';

  if (link) {
    const path = link.replace(/^\//, '').split('#')[0];
    const hash = link.includes('#') ? link.slice(link.indexOf('#') + 1) : '';
    const parts = path.split('/').filter(Boolean);

    if (parts[0] === 'posts' && parts[1]) {
      const commentMatch = hash.match(/^comment-(.+)$/);
      return {
        page: 'home',
        post_id: parts[1],
        comment_id: commentMatch?.[1] || meta.comment_id || null,
        open_comments: true,
      };
    }
    if (parts[0] === 'profile' && parts[1]) {
      return { page: 'profile', actor_id: parts[1] };
    }
    if (parts[0] === 'communities' && parts[1]) {
      return {
        page: 'communities',
        community_id: parts[1],
        post_id: parts[2] === 'posts' ? parts[3] : null,
        comment_id: hash.match(/^comment-(.+)$/)?.[1] || meta.comment_id || null,
        open_comments: Boolean(parts[2] === 'posts'),
      };
    }
    if (parts[0] === 'events' && parts[1]) {
      return { page: 'events', event_id: parts[1] };
    }
    if (parts[0] === 'questions' && parts[1]) {
      return {
        page: 'teacher',
        question_id: parts[1],
        answer_id: hash.match(/^answer-(.+)$/)?.[1] || meta.answer_id || null,
      };
    }
    if (parts[0] === 'connections') {
      return { page: 'network', network_tab: 'pending' };
    }
    if (parts[0] === 'messages') {
      return {
        page: 'messages',
        thread_id: parts[1] === 'threads' ? parts[2] : null,
      };
    }
    if (parts[0] === 'notices' && parts[1]) {
      return { page: 'home', notice_id: parts[1] };
    }
    if (parts[0] === 'jobs') {
      return { page: 'jobs' };
    }
  }

  if (type === 'follow') {
    return { page: 'profile', actor_id: meta.actor_id || notification?.actor?.id };
  }

  return { page: null };
}

export function applyNavigationIntent(navigation) {
  if (!navigation?.page) return false;

  clearNotifNavKeys();

  switch (navigation.page) {
    case 'home':
      if (navigation.post_id) {
        write(NOTIF_NAV_KEYS.POST_ID, navigation.post_id);
        write('scroll_to_post_id', navigation.post_id);
        if (navigation.highlight !== false) {
          write(NOTIF_NAV_KEYS.HIGHLIGHT_POST, navigation.post_id);
        }
      }
      if (navigation.open_comments) {
        write(NOTIF_NAV_KEYS.OPEN_COMMENTS, '1');
      }
      if (navigation.comment_id) {
        write(NOTIF_NAV_KEYS.COMMENT_ID, navigation.comment_id);
        write(NOTIF_NAV_KEYS.HIGHLIGHT_COMMENT, navigation.comment_id);
      }
      if (navigation.notice_id) {
        write(NOTIF_NAV_KEYS.NOTICE_ID, navigation.notice_id);
      }
      return true;

    case 'profile':
      write(NOTIF_NAV_KEYS.PROFILE_USER_ID, navigation.actor_id || navigation.entity_id);
      return true;

    case 'network':
      write(NOTIF_NAV_KEYS.NETWORK_TAB, navigation.network_tab || 'pending');
      if (navigation.actor_id) {
        write(NOTIF_NAV_KEYS.PROFILE_USER_ID, navigation.actor_id);
      }
      return true;

    case 'messages':
      if (navigation.thread_id) {
        write(NOTIF_NAV_KEYS.THREAD_ID, navigation.thread_id);
      } else if (navigation.actor_id) {
        write(NOTIF_NAV_KEYS.MESSAGE_USER_ID, navigation.actor_id);
        write('prefill_message_user_id', navigation.actor_id);
      }
      return true;

    case 'events':
      if (navigation.event_id) {
        write(NOTIF_NAV_KEYS.EVENT_ID, navigation.event_id);
      }
      return true;

    case 'communities':
      if (navigation.community_id) {
        write(NOTIF_NAV_KEYS.COMMUNITY_ID, navigation.community_id);
      }
      if (navigation.post_id) {
        write(NOTIF_NAV_KEYS.COMMUNITY_POST_ID, navigation.post_id);
        if (navigation.open_comments) {
          write(NOTIF_NAV_KEYS.OPEN_COMMENTS, '1');
        }
      }
      if (navigation.comment_id) {
        write(NOTIF_NAV_KEYS.COMMUNITY_COMMENT_ID, navigation.comment_id);
        write(NOTIF_NAV_KEYS.HIGHLIGHT_COMMENT, navigation.comment_id);
      }
      return true;

    case 'teacher':
    case 'library':
      if (navigation.question_id) {
        write(NOTIF_NAV_KEYS.QUESTION_ID, navigation.question_id);
      }
      if (navigation.answer_id) {
        write(NOTIF_NAV_KEYS.ANSWER_ID, navigation.answer_id);
        write(NOTIF_NAV_KEYS.HIGHLIGHT_ANSWER, navigation.answer_id);
      }
      return true;

    case 'jobs':
      if (navigation.entity_id) {
        write(NOTIF_NAV_KEYS.JOBS_PREFILL, navigation.entity_id);
      }
      return true;

    default:
      return false;
  }
}

export async function executeNotificationNavigation(
  notification,
  { onNavigate, openProfile, resolveTarget, onUnavailable } = {},
) {
  let navigation = resolveClientNavigation(notification);
  let available = true;

  if (typeof resolveTarget === 'function' && notification?.id) {
    try {
      const resolved = await resolveTarget(notification.id);
      if (resolved?.navigation) navigation = resolved.navigation;
      if (resolved?.available === false) available = false;
    } catch {
      /* fall back to client navigation */
    }
  }

  if (!navigation?.page) {
    onUnavailable?.(UNAVAILABLE_MESSAGE);
    return { ok: false, reason: 'no_target' };
  }

  if (!available) {
    onUnavailable?.(UNAVAILABLE_MESSAGE);
    return { ok: false, reason: 'unavailable' };
  }

  applyNavigationIntent(navigation);

  if (navigation.page === 'profile') {
    const id = navigation.actor_id || navigation.entity_id || sessionStorage.getItem(NOTIF_NAV_KEYS.PROFILE_USER_ID);
    if (id && openProfile) {
      openProfile(id);
      return { ok: true, page: 'profile' };
    }
  }

  const page = navigation.page === 'library' ? 'teacher' : navigation.page;
  onNavigate?.(page);
  return { ok: true, page };
}

export function consumeStringKey(key) {
  const value = sessionStorage.getItem(key);
  if (value) sessionStorage.removeItem(key);
  return value;
}

export function peekStringKey(key) {
  return sessionStorage.getItem(key);
}

export { UNAVAILABLE_MESSAGE };
