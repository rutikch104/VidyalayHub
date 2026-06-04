import { resolveMediaUrl } from '@/services/postService';

export const FALLBACK_COVER =
  'https://images.pexels.com/photos/373543/pexels-photo-373543.jpeg?auto=compress&cs=tinysrgb&w=800';
export const FALLBACK_AVATAR =
  'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150';

export function mediaOrFallback(url, fallback) {
  if (!url) return fallback;
  return resolveMediaUrl(url) || url || fallback;
}

/** Resolve avatar from community post/comment/user API shapes (flat or nested). */
export function authorAvatarSrc(entity) {
  if (!entity || typeof entity !== 'object') return '';
  const raw =
    entity.user_avatar ||
    entity.avatar_url ||
    entity.profile_picture ||
    entity.user?.avatar_url ||
    entity.user?.profile_picture ||
    entity.author?.avatar_url ||
    entity.author?.profile_picture;
  if (!raw) return '';
  return resolveMediaUrl(raw) || raw;
}

export function avatarOrFallback(entity, fallback = FALLBACK_AVATAR, currentUser = null) {
  const fromEntity = authorAvatarSrc(entity);
  if (fromEntity) return fromEntity;
  if (
    currentUser &&
    entity?.user_id != null &&
    String(entity.user_id) === String(currentUser.id)
  ) {
    const self = authorAvatarSrc(currentUser);
    if (self) return self;
  }
  return fallback;
}

export function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
}

export function formatCountLabel(count, singular, plural = `${singular}s`) {
  const n = Number(count) || 0;
  const word = n === 1 ? singular : plural;
  return `${n.toLocaleString()} ${word}`;
}

export function canModerateCommunity(community) {
  return community?.role === 'admin' || community?.role === 'moderator';
}

export function canAdminCommunity(community) {
  return community?.role === 'admin';
}
