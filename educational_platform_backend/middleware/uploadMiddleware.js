const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { CATEGORIES } = require('../config/storageConfig');
const { absolutePathForKey, ensureDirSync } = require('../storage/utils/mediaPaths');
const { assignStorageKey } = require('../services/mediaUploadService');
const { mimeAllowed, extensionAllowed } = require('../storage/utils/fileValidation');

function createCategoryFileFilter(category) {
  return (req, file, cb) => {
    const mimetype = (file.mimetype || '').toLowerCase();
    if (!mimeAllowed(mimetype, category)) {
      return cb(new Error(`File type not allowed for ${category}.`), false);
    }
    if (!extensionAllowed(file.originalname)) {
      return cb(new Error('File extension not allowed.'), false);
    }
    cb(null, true);
  };
}

function createMulterStorage(category) {
  return multer.diskStorage({
    destination(req, file, cb) {
      try {
        const ownerId = req.user?.id || req.userId || 'anonymous';
        const tenantId = req.user?.tenant_id || req.tenant?.id || null;
        assignStorageKey(file, category, ownerId, tenantId);
        const dir = path.dirname(absolutePathForKey(file.storageKey));
        ensureDirSync(dir, fs);
        cb(null, dir);
      } catch (err) {
        cb(err);
      }
    },
    filename(req, file, cb) {
      try {
        if (!file.storageKey) {
          const ownerId = req.user?.id || 'anonymous';
          const tenantId = req.user?.tenant_id || req.tenant?.id || null;
          assignStorageKey(file, category, ownerId, tenantId);
        }
        cb(null, path.basename(file.storageKey));
      } catch (err) {
        cb(err);
      }
    },
  });
}

/**
 * Factory: multer middleware for a storage category (post, avatar, message, …).
 */
function createUpload(category, options = {}) {
  const cfg = CATEGORIES[category];
  if (!cfg) {
    throw new Error(`Unknown upload category: ${category}`);
  }

  const maxCount = options.maxCount ?? cfg.maxFiles ?? 1;
  const field = options.field;

  const m = multer({
    storage: createMulterStorage(category),
    fileFilter: createCategoryFileFilter(category),
    limits: {
      fileSize: cfg.maxFileSize,
      files: maxCount,
    },
  });

  if (field) {
    if (maxCount > 1) return m.array(field, maxCount);
    return m.single(field);
  }
  if (maxCount > 1) return m.array('media', maxCount);
  return m.single('file');
}

function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'File is too large.'
        : err.code === 'LIMIT_FILE_COUNT'
          ? 'Too many files.'
          : err.message || 'File upload error.';
    return res.status(400).json({ status: false, message, error: err.code });
  }
  if (err && err.message && /not allowed|upload/i.test(err.message)) {
    return res.status(400).json({ status: false, message: err.message });
  }
  next(err);
}

/** Legacy export: default post upload array */
const legacyUpload = createUpload('post', { field: 'media', maxCount: 5 });

/** Wrap multer middleware with consistent 400 responses */
function withUpload(multerMiddleware) {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) return handleUploadError(err, req, res, next);
      next();
    });
  };
}

const upload = {
  post: createUpload('post', { field: 'media', maxCount: 5 }),
  avatar: createUpload('avatar', { field: 'avatar', maxCount: 1 }),
  cover: createUpload('cover', { field: 'cover', maxCount: 1 }),
  message: createUpload('message', { field: 'media', maxCount: 1 }),
  library: createUpload('library', { field: 'file', maxCount: 1 }),
  resume: createUpload('resume', { field: 'resume', maxCount: 1 }),
  attachment: createUpload('attachment', { field: 'attachments', maxCount: 5 }),
};

const safeUpload = {
  post: withUpload(upload.post),
  avatar: withUpload(upload.avatar),
  cover: withUpload(upload.cover),
  message: withUpload(upload.message),
  library: withUpload(upload.library),
  resume: withUpload(upload.resume),
  attachment: withUpload(upload.attachment),
};

module.exports = {
  upload: safeUpload,
  createUpload,
  handleUploadError,
  withUpload,
  legacyUpload: withUpload(legacyUpload),
};
