/**
 * @deprecated Import from middleware/uploadMiddleware.js — kept for backward compatibility.
 */
const { upload, legacyUpload, handleUploadError } = require('./uploadMiddleware');

module.exports = {
  upload: legacyUpload,
  uploadCategories: upload,
  handleUploadError,
};
