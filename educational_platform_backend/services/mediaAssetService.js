const db = require('../database/index');
const StorageService = require('../storage/StorageService');

/**
 * Optional audit log for uploads — supports future S3 migration tracking.
 */
async function recordMediaAsset(descriptor, {
  ownerId,
  tenantId = null,
  category,
  entityType = null,
  entityId = null,
}) {
  if (!db.MediaAsset || !descriptor?.storage_key) return null;
  try {
    return await db.MediaAsset.create({
      owner_id: ownerId,
      tenant_id: tenantId || null,
      category,
      entity_type: entityType,
      entity_id: entityId,
      storage_key: descriptor.storage_key,
      public_url: descriptor.url,
      mime_type: descriptor.mime_type,
      size_bytes: descriptor.size,
      original_name: descriptor.original_name,
      media_type: descriptor.type,
      metadata: descriptor.metadata || {},
      provider: StorageService.getInstance().getProviderName(),
    });
  } catch (err) {
    console.warn('[mediaAsset] record failed:', err.message);
    return null;
  }
}

module.exports = { recordMediaAsset };
