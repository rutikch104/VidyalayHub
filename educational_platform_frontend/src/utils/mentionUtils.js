/** @mention token inserted in composer text (no spaces). */
export function mentionTokenFromUser(user) {
  const a = (user?.first_name || '').replace(/\s+/g, '');
  const b = (user?.last_name || '').replace(/\s+/g, '');
  if (a || b) return `${a}${b}`;
  const n = (user?.name || '').replace(/\s+/g, '');
  return n || `user${String(user?.id || '').slice(0, 6)}`;
}

export function mentionDisplayName(user) {
  if (!user) return 'User';
  const n = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return n || user.name || user.email || 'User';
}

/** Map @mention tokens in text to user ids (from API mention rows). */
export function buildMentionUserMap(mentions = []) {
  const map = {};
  for (const row of mentions) {
    const u = row?.mentionedUser;
    if (!u?.id) continue;
    map[mentionTokenFromUser(u).toLowerCase()] = String(u.id);
  }
  return map;
}

export function mentionAvatar(user, currentUser = null) {
  const raw = user?.profile_picture || user?.avatar_url || user?.user_avatar;
  if (raw) {
    if (/^https?:\/\//i.test(String(raw))) return raw;
    try {
      const { resolveMediaUrl } = require('@/services/postService');
      return resolveMediaUrl(raw) || raw;
    } catch {
      return raw;
    }
  }
  if (currentUser && user?.id && String(user.id) === String(currentUser.id)) {
    const self = currentUser.profile_picture || currentUser.avatar_url;
    if (self) return self;
  }
  return 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150';
}
