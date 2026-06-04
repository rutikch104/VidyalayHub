// @ts-nocheck
import { resolveMediaUrl } from '@/services/postService';

export function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}

export { mentionTokenFromUser } from '@/utils/mentionUtils';

export function userDisplayName(user, anonymous = false) {
  if (anonymous) return 'Anonymous';
  if (!user) return 'Unknown';
  return [user.first_name, user.last_name].filter(Boolean).join(' ') || 'User';
}

export function userAvatar(user) {
  if (!user || typeof user !== 'object') return null;
  const raw =
    user.profile_picture ||
    user.avatar_url ||
    user.user_avatar;
  if (!raw) return null;
  if (/^https?:\/\//i.test(String(raw))) return raw;
  return resolveMediaUrl(raw) || raw;
}

export function avatarOrFallback(user, currentUser = null) {
  const fromUser = userAvatar(user);
  if (fromUser) return fromUser;
  const userId = user?.id || user?.user_id;
  if (currentUser && userId && String(userId) === String(currentUser.id)) {
    const self = userAvatar(currentUser);
    if (self) return self;
  }
  return FALLBACK_AVATAR;
}

/** Build threaded replies from flat API rows (legacy) or pass-through trees. */
export function buildAnswerReplyTree(comments) {
  if (!Array.isArray(comments) || !comments.length) return [];
  const hasParentIds = comments.some((c) => c.parent_id);
  if (!hasParentIds && comments.some((c) => Array.isArray(c.replies))) {
    return comments;
  }
  const nodes = comments.map((c) => ({ ...c, replies: [] }));
  const byId = new Map(nodes.map((n) => [String(n.id), n]));
  const roots = [];
  nodes.forEach((n) => {
    const pid = n.parent_id ? String(n.parent_id) : '';
    if (pid && byId.has(pid)) byId.get(pid).replies.push(n);
    else if (!pid) roots.push(n);
  });
  const sortAsc = (list) => {
    list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    list.forEach((item) => sortAsc(item.replies || []));
  };
  sortAsc(roots);
  return roots;
}

export function countDescendantReplies(replies) {
  if (!replies?.length) return 0;
  return replies.reduce((sum, r) => sum + 1 + countDescendantReplies(r.replies), 0);
}

export function addReplyToTree(roots, comment) {
  const node = { ...comment, replies: [] };
  if (!comment.parent_id) return [...roots, node];
  const insert = (list) =>
    list.map((item) => {
      if (String(item.id) === String(comment.parent_id)) {
        return { ...item, replies: [...(item.replies || []), node] };
      }
      if (item.replies?.length) {
        return { ...item, replies: insert(item.replies) };
      }
      return item;
    });
  return insert(roots);
}

export function normalizeQuestion(q) {
  if (!q) return q;
  const answers = (q.answers || []).map((a) => ({
    ...a,
    comments: buildAnswerReplyTree(a.comments || []),
  }));
  return {
    ...q,
    answers,
    likes_count: q.likes_count ?? q.likes?.length ?? 0,
    comments_count: q.comments_count ?? q.comments?.length ?? 0,
    answers_count: q.answers_count ?? answers.length ?? 0,
    is_liked: q.is_liked ?? false,
  };
}

export function questionStatus(q) {
  if (q?.is_resolved) return { id: 'resolved', label: 'Resolved' };
  if ((q?.answers_count ?? 0) > 0) return { id: 'answered', label: 'Answered' };
  return { id: 'open', label: 'Open' };
}

/** Newest first — display-only sort for answer lists. */
export function sortAnswersByNewest(answers) {
  if (!Array.isArray(answers) || answers.length < 2) return answers || [];
  return [...answers].sort((a, b) => {
    const ta = a?.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b?.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });
}

export const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'answered', label: 'Answered' },
  { id: 'resolved', label: 'Resolved' },
];

export const FALLBACK_AVATAR =
  'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150';
