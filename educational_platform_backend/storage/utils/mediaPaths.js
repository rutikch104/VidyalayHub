const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { UPLOAD_ROOT, PUBLIC_BASE_PATH, CATEGORIES } = require('../../config/storageConfig');

function sanitizeSegment(seg) {
  return String(seg || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'unknown';
}

function categorySubdir(category) {
  const cfg = CATEGORIES[category];
  return cfg?.subdir || 'misc';
}

/** Relative storage key: tenants/{tenantId}/posts/userId/uuid.ext (legacy: posts/userId/...) */
function buildStorageKey(category, ownerId, originalname, tenantId = null) {
  const ext = path.extname(originalname || '').toLowerCase() || '';
  const safeExt = ext && ext.length <= 12 ? ext : '';
  const folder = categorySubdir(category);
  const owner = sanitizeSegment(ownerId);
  const filePart = `${owner}/${uuidv4()}${safeExt}`;
  if (tenantId) {
    const tid = sanitizeSegment(String(tenantId));
    return `tenants/${tid}/${folder}/${filePart}`;
  }
  return `${folder}/${filePart}`;
}

function absolutePathForKey(storageKey) {
  return path.join(UPLOAD_ROOT, storageKey);
}

function publicPathForKey(storageKey) {
  const base = PUBLIC_BASE_PATH.replace(/\/$/, '');
  const key = storageKey.replace(/^\/+/, '');
  return `${base}/${key}`;
}

/** Parse legacy /uploads/x or /media/posts/... into storage key */
function storageKeyFromStoredUrl(stored) {
  if (!stored || typeof stored !== 'string') return null;
  const trimmed = stored.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      const p = u.pathname.replace(/^\/media\//, '').replace(/^\/uploads\//, '');
      return p || null;
    } catch {
      return null;
    }
  }
  if (trimmed.startsWith('/media/')) return trimmed.slice('/media/'.length);
  if (trimmed.startsWith('/uploads/')) return trimmed.slice('/uploads/'.length);
  return trimmed.replace(/^\/+/, '') || null;
}

function ensureDirSync(dirPath, fs) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

module.exports = {
  buildStorageKey,
  absolutePathForKey,
  publicPathForKey,
  storageKeyFromStoredUrl,
  ensureDirSync,
  sanitizeSegment,
  categorySubdir,
};
