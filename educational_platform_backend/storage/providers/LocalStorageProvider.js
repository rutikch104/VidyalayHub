const fs = require('fs');
const { UPLOAD_ROOT } = require('../../config/storageConfig');
const {
  absolutePathForKey,
  publicPathForKey,
  ensureDirSync,
} = require('../utils/mediaPaths');

class LocalStorageProvider {
  constructor() {
    ensureDirSync(UPLOAD_ROOT, fs);
  }

  getProviderName() {
    return 'local';
  }

  async deleteByKey(storageKey) {
    if (!storageKey) return false;
    const abs = absolutePathForKey(storageKey);
    try {
      if (fs.existsSync(abs)) {
        await fs.promises.unlink(abs);
        return true;
      }
    } catch (err) {
      console.warn('[LocalStorage] delete failed:', storageKey, err.message);
    }
    return false;
  }

  async deleteByStoredUrl(storedUrl) {
    const { storageKeyFromStoredUrl } = require('../utils/mediaPaths');
    const key = storageKeyFromStoredUrl(storedUrl);
    if (!key) return false;
    return this.deleteByKey(key);
  }

  getPublicPath(storageKey) {
    return publicPathForKey(storageKey);
  }

  /** After multer saves file at absolute path, confirm it exists */
  async finalizeMulterFile({ storageKey, absolutePath }) {
    try {
      const stat = await fs.promises.stat(absolutePath);
      if (!stat.isFile() || stat.size <= 0) {
        throw new Error('Uploaded file is empty or invalid.');
      }
      return { storageKey, size: stat.size, absolutePath };
    } catch (err) {
      try {
        await fs.promises.unlink(absolutePath);
      } catch (_) { /* ignore */ }
      throw err;
    }
  }

  resolveAbsolutePath(storageKey) {
    return absolutePathForKey(storageKey);
  }
}

module.exports = LocalStorageProvider;
