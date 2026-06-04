const StorageService = require('../storage/StorageService');
const { validateUploadedFile, inferMediaType } = require('../storage/utils/fileValidation');
const { buildStorageKey, absolutePathForKey } = require('../storage/utils/mediaPaths');

/**
 * Build API media descriptor from a multer file (must have file.storageKey set by upload middleware).
 */
async function descriptorFromMulterFile(file, category) {
  const validation = validateUploadedFile(file, category);
  if (!validation.ok) {
    const err = new Error(validation.message);
    err.status = 400;
    throw err;
  }

  if (!file.storageKey) {
    const err = new Error('Upload failed: missing storage key. Please retry.');
    err.status = 500;
    throw err;
  }
  if (!file.path) {
    const err = new Error('Upload failed: file path missing. Please retry.');
    err.status = 500;
    throw err;
  }

  const storageKey = file.storageKey;
  const storage = StorageService.getInstance();
  await storage.finalizeMulterFile({
    storageKey,
    absolutePath: file.path,
  });

  const url = storage.getPublicPath(storageKey);
  const type = inferMediaType(file.mimetype, file.originalname);

  return {
    url,
    storage_key: storageKey,
    type,
    mime_type: file.mimetype,
    size: file.size,
    original_name: file.originalname,
    metadata: {
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    },
  };
}

/** Process single or multiple multer files into descriptors */
async function processUploadedFiles(files, category) {
  if (!files) return [];
  const list = Array.isArray(files) ? files : [files];
  const results = [];
  for (const file of list) {
    if (!file) continue;
    results.push(await descriptorFromMulterFile(file, category));
  }
  return results;
}

/** Simple public URL string for legacy columns (profile_picture, file_url, media_url) */
async function publicUrlFromMulterFile(file, category) {
  const d = await descriptorFromMulterFile(file, category);
  return d.url;
}

/** Post/media_urls JSON shape (backward compatible) */
function toPostMediaShape(descriptor) {
  return {
    url: descriptor.url,
    type: descriptor.type,
    storage_key: descriptor.storage_key,
    mime_type: descriptor.mime_type,
    size: descriptor.size,
    metadata: descriptor.metadata,
  };
}

/** Attachment row shape for global questions */
function mapAttachmentEnumType(mimetype) {
  if (!mimetype) return 'other';
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype === 'application/pdf') return 'pdf';
  if (
    mimetype.includes('word') ||
    mimetype === 'application/msword' ||
    mimetype === 'text/plain'
  ) {
    return 'doc';
  }
  return 'other';
}

function toAttachmentShape(descriptor, type, typeId, uploadedBy) {
  return {
    type,
    type_id: typeId,
    file_url: descriptor.url,
    storage_key: descriptor.storage_key,
    file_type: mapAttachmentEnumType(descriptor.mime_type),
    file_size: descriptor.size,
    original_name: descriptor.original_name,
    uploaded_by: uploadedBy,
  };
}

/** Remove previous file when replacing profile/cover */
async function replaceStoredMedia(oldStoredUrl) {
  if (!oldStoredUrl) return;
  const storage = StorageService.getInstance();
  await storage.deleteByStoredUrl(oldStoredUrl);
}

/** Pre-generate storage key for multer (attached to file in middleware) */
function assignStorageKey(file, category, ownerId, tenantId = null) {
  const storageKey = buildStorageKey(category, ownerId, file.originalname, tenantId);
  file.storageKey = storageKey;
  return storageKey;
}

module.exports = {
  descriptorFromMulterFile,
  processUploadedFiles,
  publicUrlFromMulterFile,
  toPostMediaShape,
  toAttachmentShape,
  mapAttachmentEnumType,
  replaceStoredMedia,
  assignStorageKey,
  inferMediaType,
};
