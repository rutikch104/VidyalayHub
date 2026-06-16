import {
  Bell,
  User,
  MessageCircle,
  Heart,
  Share2,
  Award,
  Calendar,
  BookOpen,
  Star,
  UserPlus,
  AtSign,
} from 'lucide-react';
import {
  executeNotificationNavigation as runNotificationNavigation,
} from '@/lib/notificationNavigation';

export function canonicalNotificationType(type) {
  const legacy = {
    post_like: 'like',
    post_comment: 'comment',
    post_mention: 'mention',
    question_answer: 'answer',
    question_answered: 'answer',
    question_mention: 'mention',
    question_liked: 'like',
    question_comment: 'comment',
  };
  return legacy[type] || type;
}

export function isNotificationUnread(n) {
  if (n.is_read === true) return false;
  if (n.is_read === false) return true;
  return !n.read_at;
}

export function getNotificationStyle(type) {
  const t = canonicalNotificationType(type);
  switch (t) {
    case 'like':
      return { icon: Heart, tone: 'rose', label: 'Like' };
    case 'comment':
      return { icon: MessageCircle, tone: 'sky', label: 'Comment' };
    case 'mention':
      return { icon: AtSign, tone: 'emerald', label: 'Mention' };
    case 'message':
      return { icon: MessageCircle, tone: 'emerald', label: 'Message' };
    case 'answer':
      return { icon: BookOpen, tone: 'cyan', label: 'Answer' };
    case 'follow':
      return { icon: UserPlus, tone: 'violet', label: 'Follow' };
    case 'connection_request':
      return { icon: UserPlus, tone: 'violet', label: 'Connection' };
    case 'job_application':
      return { icon: Award, tone: 'amber', label: 'Jobs' };
    case 'endorsement':
    case 'skill_endorsement':
      return { icon: Star, tone: 'amber', label: 'Endorsement' };
    case 'post_share':
      return { icon: Share2, tone: 'sky', label: 'Amplify' };
    case 'group_invite':
      return { icon: User, tone: 'violet', label: 'Community' };
    case 'event_reminder':
      return { icon: Calendar, tone: 'indigo', label: 'Event' };
    case 'course_enrollment':
    case 'certification_earned':
    case 'achievement_unlocked':
      return { icon: BookOpen, tone: 'teal', label: 'Achievement' };
    default:
      return { icon: Bell, tone: 'slate', label: 'Update' };
  }
}

export function initialsFromName(name) {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function resolveNotificationActor(notification) {
  if (notification?.actor?.name) return notification.actor;
  const meta = notification?.metadata || {};
  const fallbackName = parseActorNameFromBody(notification?.body);
  if (fallbackName || meta.actor_id) {
    return {
      id: meta.actor_id || null,
      name: fallbackName || meta.actor_name || 'Someone',
      avatar_url: meta.actor_avatar || null,
    };
  }
  return null;
}

export function parseActorNameFromBody(body) {
  if (!body || typeof body !== 'string') return null;
  const match = body.match(
    /^(.+?)\s+(liked|commented|replied|mentioned|started following|sent you|shared|applied|endorsed|answered|invited you)/i,
  );
  return match ? match[1].trim() : null;
}

/** Strip leading "Name action" prefix from body to get action-only text. */
export function getNotificationActionText(notification) {
  const type = canonicalNotificationType(notification?.type);
  const body = notification?.body || '';
  const actor = resolveNotificationActor(notification);
  const actorName = actor?.name;

  if (actorName && body.startsWith(actorName)) {
    const rest = body.slice(actorName.length).trim();
    if (rest) return rest;
  }

  const templates = {
    like: 'liked your post',
    comment: 'commented on your post',
    mention: 'mentioned you',
    follow: 'started following you',
    connection_request: 'sent you a connection request',
    message: 'sent you a message',
    answer: 'answered your question',
    post_share: 'shared your post',
    endorsement: 'endorsed your skill',
    skill_endorsement: 'endorsed your skill',
    job_application: 'applied to your job posting',
    group_invite: 'invited you to a community',
    event_reminder: 'event reminder',
  };

  if (templates[type]) return templates[type];

  if (notification?.title && notification.title !== body) {
    return notification.title;
  }
  return body || 'sent you an update';
}

export function getNotificationPreview(notification) {
  const preview =
    notification?.content_preview ||
    notification?.metadata?.content_preview ||
    notification?.metadata?.message_preview ||
    notification?.metadata?.post_preview;

  if (preview) return String(preview).trim();

  const type = canonicalNotificationType(notification?.type);
  const body = notification?.body || '';

  if (type === 'message' && body.includes(':')) {
    const idx = body.indexOf(':');
    const after = body.slice(idx + 1).trim();
    if (after) return after;
  }

  return null;
}

export function getNotificationPrimaryAction(notification) {
  const type = canonicalNotificationType(notification?.type);
  const link = notification?.link_url;

  if (type === 'connection_request') {
    return { label: 'View request', href: link || '/connections/pending' };
  }
  if (type === 'follow') {
    return { label: 'View profile', href: link };
  }
  if (type === 'like' || type === 'comment' || type === 'mention' || type === 'post_share') {
    return { label: 'View post', href: link };
  }
  if (type === 'message' || type === 'group_invite') {
    return { label: 'View message', href: link };
  }
  if (type === 'answer') {
    return { label: 'View answer', href: link };
  }
  if (type === 'event_reminder') {
    return { label: 'View event', href: link };
  }
  if (type === 'job_application') {
    return { label: 'View application', href: link };
  }
  if (link) return { label: 'View', href: link };
  return null;
}

export function formatGroupedActorNames(actors) {
  const names = actors.map((a) => a?.name).filter(Boolean);
  if (names.length === 0) return 'Others';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  if (names.length === 3) return `${names[0]}, ${names[1]}, and ${names[2]}`;
  return `${names[0]}, ${names[1]}, and ${names.length - 2} others`;
}

export function getGroupedActionText(type, count) {
  const t = canonicalNotificationType(type);
  if (t === 'like') return count > 1 ? 'liked your post' : 'liked your post';
  if (t === 'post_share') return count > 1 ? 'shared your post' : 'shared your post';
  if (t === 'comment') return count > 1 ? 'commented on your post' : 'commented on your post';
  if (t === 'follow') return count > 1 ? 'started following you' : 'started following you';
  return 'interacted with your content';
}

/**
 * Group similar notifications (likes/shares on same target) for a cleaner feed.
 */
export function groupNotificationsForDisplay(notifications) {
  if (!Array.isArray(notifications) || notifications.length === 0) return [];

  const groupableTypes = new Set(['like', 'post_share']);
  const buckets = new Map();
  const singles = [];

  for (const n of notifications) {
    const type = canonicalNotificationType(n.type);
    const targetId = n.target_id || n.metadata?.target_id;

    if (groupableTypes.has(type) && targetId) {
      const key = `${type}:${targetId}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(n);
    } else {
      singles.push({ kind: 'single', item: n, id: String(n.id) });
    }
  }

  const groups = [];
  for (const [key, items] of buckets) {
    if (items.length > 1) {
      const [type] = key.split(':');
      groups.push({
        kind: 'group',
        type,
        items: items.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
        id: `group-${key}`,
      });
    } else {
      singles.push({ kind: 'single', item: items[0], id: String(items[0].id) });
    }
  }

  const merged = [...groups, ...singles];
  merged.sort((a, b) => {
    const dateA = a.kind === 'group' ? a.items[0]?.created_at : a.item?.created_at;
    const dateB = b.kind === 'group' ? b.items[0]?.created_at : b.item?.created_at;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  return merged;
}

export function getDisplayEntryIds(entry) {
  if (entry.kind === 'group') return entry.items.map((n) => n.id);
  return [entry.item.id];
}

export function isDisplayEntryUnread(entry) {
  if (entry.kind === 'group') return entry.items.some(isNotificationUnread);
  return isNotificationUnread(entry.item);
}

export function navigateFromNotification(linkUrl, handlers = {}) {
  void runNotificationNavigation({ link_url: linkUrl }, handlers);
}

export { executeNotificationNavigation, resolveClientNavigation } from '@/lib/notificationNavigation';

export function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) {
    const mins = Math.floor(diffInSeconds / 60);
    return mins === 1 ? '1 minute ago' : `${mins} minutes ago`;
  }
  if (diffInSeconds < 86400) {
    const hrs = Math.floor(diffInSeconds / 3600);
    return hrs === 1 ? '1 hour ago' : `${hrs} hours ago`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }
  if (diffInSeconds < 2592000) {
    const weeks = Math.floor(diffInSeconds / 604800);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatFullDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
