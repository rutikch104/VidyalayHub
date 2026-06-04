const fs = require('fs');
const path = require('path');
const { UPLOAD_ROOT } = require('../config/storageConfig');
const { storageKeyFromStoredUrl, absolutePathForKey } = require('../storage/utils/mediaPaths');

const MIME_BY_EXT = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain',
};

function resolveResourceAbsolutePath(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return null;

  const key = storageKeyFromStoredUrl(fileUrl);
  if (key) {
    const abs = absolutePathForKey(key);
    if (fs.existsSync(abs)) return abs;
  }

  const trimmed = fileUrl.trim();
  const basename = path.basename(trimmed.split('?')[0]);
  if (basename) {
    const legacy = path.join(UPLOAD_ROOT, basename);
    if (fs.existsSync(legacy)) return legacy;
  }

  return null;
}

function mimeForResourcePath(absPath) {
  const ext = path.extname(absPath || '').toLowerCase();
  return MIME_BY_EXT[ext] || 'application/octet-stream';
}

function safeResourceFilename(title, absPath) {
  const ext = path.extname(absPath || '') || '';
  const base =
    title && String(title).trim()
      ? String(title).replace(/[/\\?%*:|"<>]/g, '-').trim()
      : path.basename(absPath || 'resource');
  return `${base}${ext && !base.toLowerCase().endsWith(ext.toLowerCase()) ? ext : ''}`;
}

module.exports = {
  resolveResourceAbsolutePath,
  mimeForResourcePath,
  safeResourceFilename,
};
