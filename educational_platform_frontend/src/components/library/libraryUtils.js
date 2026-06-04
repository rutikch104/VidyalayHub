import { resolveMediaUrl } from '@/services/postService';

export function formatBytes(bytes) {
  const n = Number(bytes);
  if (!n || n < 1) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatResourceDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function mapResourceFromApi(resource) {
  const u = resource.uploader || {};
  const authorName =
    resource.uploader_name ||
    u.name ||
    [u.first_name, u.last_name].filter(Boolean).join(' ').trim() ||
    'Student';
  const pic = u.profile_picture || u.avatar_url;
  return {
    ...resource,
    tags: Array.isArray(resource.tags) ? resource.tags : [],
    type: (resource.resource_type || 'PDF').toUpperCase(),
    author: authorName,
    college: resource.college_name || resource.tenant?.name || 'Shared',
    date: formatResourceDate(resource.created_at),
    fileSize: formatBytes(resource.file_size_bytes),
    likes: resource.likes_count ?? 0,
    downloads: resource.downloads_count ?? 0,
    views: resource.views_count ?? 0,
    is_liked: !!resource.is_liked,
    avatar:
      resolveMediaUrl(pic || '') ||
      pic ||
      'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150',
    fileUrl: resolveMediaUrl(resource.file_url) || resource.file_url,
  };
}

/** Merge API count fields into a document row used by the UI. */
export function applyResourceCounts(doc, { views, downloads } = {}) {
  if (!doc) return doc;
  const next = { ...doc };
  if (views != null) {
    next.views = views;
    next.views_count = views;
  }
  if (downloads != null) {
    next.downloads = downloads;
    next.downloads_count = downloads;
  }
  return next;
}

export function isPdfResource(doc) {
  const t = String(doc.type || '').toUpperCase();
  const url = String(doc.file_url || doc.fileUrl || '').toLowerCase();
  return t === 'PDF' || url.endsWith('.pdf');
}
