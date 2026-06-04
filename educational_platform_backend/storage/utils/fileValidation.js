const path = require('path');
const { CATEGORIES } = require('../../config/storageConfig');

const SAFE_EXT = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.heic', '.heif',
  '.mp4', '.webm', '.mpeg', '.mov', '.ogg',
  '.mp3', '.wav', '.m4a',
  '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.json', '.js', '.py', '.java', '.cpp', '.c', '.html', '.css',
]);

function mimeAllowed(mimetype, category) {
  const cfg = CATEGORIES[category];
  if (!cfg) return false;
  const m = (mimetype || '').toLowerCase();
  if (cfg.allowedMimePrefixes?.some((p) => m.startsWith(p))) return true;
  if (cfg.allowedMimeTypes?.includes(m)) return true;
  if (m === 'application/octet-stream' && category === 'post') return true;
  return false;
}

function extensionAllowed(originalname) {
  const ext = path.extname(originalname || '').toLowerCase();
  if (!ext) return true;
  return SAFE_EXT.has(ext);
}

function validateUploadedFile(file, category) {
  if (!file) return { ok: false, message: 'No file provided.' };
  if (!file.size || file.size <= 0) return { ok: false, message: 'Empty file upload.' };

  const cfg = CATEGORIES[category];
  if (!cfg) return { ok: false, message: `Unknown upload category: ${category}` };

  if (file.size > cfg.maxFileSize) {
    const mb = Math.round(cfg.maxFileSize / (1024 * 1024));
    return { ok: false, message: `File exceeds maximum size of ${mb}MB.` };
  }

  const mimetype = (file.mimetype || '').toLowerCase();
  if (!mimeAllowed(mimetype, category)) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const imageExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'].includes(ext);
    if (!(mimetype === 'application/octet-stream' && imageExt && category === 'post')) {
      return { ok: false, message: `File type not allowed: ${mimetype || 'unknown'}` };
    }
  }

  if (!extensionAllowed(file.originalname)) {
    return { ok: false, message: 'File extension not allowed.' };
  }

  return { ok: true };
}

function inferMediaType(mimetype, originalname = '') {
  const m = (mimetype || '').toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/')) return 'audio';
  const ext = path.extname(originalname || '').toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.heic', '.heif', '.bmp'].includes(ext)) {
    return 'image';
  }
  if (['.mp4', '.webm', '.mov', '.mpeg', '.ogg'].includes(ext)) return 'video';
  if (['.mp3', '.wav', '.m4a', '.aac'].includes(ext)) return 'audio';
  if (m === 'application/octet-stream' && ext) {
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'].includes(ext)) return 'image';
  }
  return 'file';
}

module.exports = {
  validateUploadedFile,
  inferMediaType,
  mimeAllowed,
  extensionAllowed,
};
