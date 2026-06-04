const { PROVIDER } = require('../config/storageConfig');
const LocalStorageProvider = require('./providers/LocalStorageProvider');
const S3StorageProvider = require('./providers/S3StorageProvider');

let instance = null;

class StorageService {
  constructor() {
    this.provider =
      PROVIDER === 's3' ? new S3StorageProvider() : new LocalStorageProvider();
  }

  static getInstance() {
    if (!instance) instance = new StorageService();
    return instance;
  }

  getProviderName() {
    return this.provider.getProviderName();
  }

  getPublicPath(storageKey) {
    return this.provider.getPublicPath(storageKey);
  }

  deleteByStoredUrl(url) {
    return this.provider.deleteByStoredUrl(url);
  }

  deleteByKey(key) {
    return this.provider.deleteByKey(key);
  }

  finalizeMulterFile(opts) {
    return this.provider.finalizeMulterFile(opts);
  }
}

module.exports = StorageService;
