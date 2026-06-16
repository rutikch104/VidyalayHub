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

export function formatCompactCount(n) {
  const value = Number(n) || 0;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(value);
}

export function communityInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  if (parts.length === 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function getCommunityTheme(category) {
  const key = String(category || 'general').toLowerCase();
  if (['engineering', 'science'].includes(key)) return 'teal';
  if (['technology', 'tech'].includes(key)) return 'sky';
  if (['business', 'education'].includes(key)) return 'emerald';
  if (['arts', 'interest', 'general'].includes(key)) return 'purple';
  return 'violet';
}

export function formatCategoryLabel(category) {
  const raw = String(category || '').trim();
  if (!raw) return 'Community';
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function canModerateCommunity(community) {
  return community?.role === 'admin' || community?.role === 'moderator';
}

export function canAdminCommunity(community) {
  return community?.role === 'admin';
}
