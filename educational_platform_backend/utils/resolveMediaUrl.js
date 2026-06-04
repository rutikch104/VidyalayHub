const { PUBLIC_BASE_URL, PUBLIC_BASE_PATH } = require('../config/storageConfig');
const { storageKeyFromStoredUrl } = require('../storage/utils/mediaPaths');
const StorageService = require('../storage/StorageService');

/**
 * Resolve stored media reference to a client-fetchable URL.
 * Supports legacy `/uploads/...`, new `/media/...`, storage keys, and absolute URLs.
 */
function resolveMediaUrl(stored) {
  if (!stored || typeof stored !== 'string') return '';
  const trimmed = stored.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  if (trimmed.startsWith(`${PUBLIC_BASE_PATH}/`) || trimmed.startsWith('/uploads/')) {
    return PUBLIC_BASE_URL ? `${PUBLIC_BASE_URL}${trimmed}` : trimmed;
  }

  const key = storageKeyFromStoredUrl(trimmed);
  if (key) {
    const path = StorageService.getInstance().getPublicPath(key);
    return PUBLIC_BASE_URL ? `${PUBLIC_BASE_URL}${path}` : path;
  }

  return trimmed;
}

module.exports = { resolveMediaUrl };
