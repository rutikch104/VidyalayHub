/**
 * Storage configuration — switch providers via env without code changes.
 */
const path = require('path');

const ROOT = path.join(__dirname, '..');
const UPLOAD_ROOT = process.env.UPLOAD_ROOT || path.join(ROOT, 'uploads');
const PUBLIC_BASE_PATH = process.env.MEDIA_PUBLIC_BASE_PATH || '/media';
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || process.env.API_PUBLIC_URL || '').replace(/\/$/, '');

const PROVIDER = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();

const CATEGORIES = {
  post: {
    subdir: 'posts',
    maxFiles: 5,
    maxFileSize: parseInt(process.env.UPLOAD_MAX_POST_BYTES || String(25 * 1024 * 1024), 10),
    allowedMimePrefixes: ['image/', 'video/'],
    allowedMimeTypes: [
      'image/heic',
      'image/heif',
      'application/octet-stream',
      'application/pdf',
      'text/plain',
      'text/javascript',
      'application/json',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  avatar: {
    subdir: 'profiles/avatars',
    maxFiles: 1,
    maxFileSize: parseInt(process.env.UPLOAD_MAX_AVATAR_BYTES || String(5 * 1024 * 1024), 10),
    allowedMimePrefixes: ['image/'],
  },
  cover: {
    subdir: 'profiles/covers',
    maxFiles: 1,
    maxFileSize: parseInt(process.env.UPLOAD_MAX_COVER_BYTES || String(8 * 1024 * 1024), 10),
    allowedMimePrefixes: ['image/'],
  },
  tenantLogo: {
    subdir: 'tenants/logos',
    maxFiles: 1,
    maxFileSize: parseInt(process.env.UPLOAD_MAX_TENANT_LOGO_BYTES || String(5 * 1024 * 1024), 10),
    allowedMimePrefixes: ['image/'],
    allowedMimeTypes: ['image/svg+xml'],
  },
  message: {
    subdir: 'messages',
    maxFiles: 1,
    maxFileSize: parseInt(process.env.UPLOAD_MAX_MESSAGE_BYTES || String(20 * 1024 * 1024), 10),
    allowedMimePrefixes: ['image/', 'video/', 'audio/'],
    allowedMimeTypes: ['application/pdf'],
  },
  library: {
    subdir: 'library',
    maxFiles: 1,
    maxFileSize: parseInt(process.env.UPLOAD_MAX_LIBRARY_BYTES || String(50 * 1024 * 1024), 10),
    allowedMimePrefixes: ['image/', 'video/'],
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
    ],
  },
  resume: {
    subdir: 'jobs/resumes',
    maxFiles: 1,
    maxFileSize: parseInt(process.env.UPLOAD_MAX_RESUME_BYTES || String(5 * 1024 * 1024), 10),
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  attachment: {
    subdir: 'attachments',
    maxFiles: 5,
    maxFileSize: parseInt(process.env.UPLOAD_MAX_ATTACHMENT_BYTES || String(10 * 1024 * 1024), 10),
    allowedMimePrefixes: ['image/'],
    allowedMimeTypes: [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  verification: {
    subdir: 'registration/verification',
    maxFiles: 5,
    maxFileSize: parseInt(process.env.UPLOAD_MAX_VERIFICATION_BYTES || String(5 * 1024 * 1024), 10),
    allowedMimePrefixes: ['image/'],
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
};

module.exports = {
  PROVIDER,
  UPLOAD_ROOT,
  PUBLIC_BASE_PATH,
  PUBLIC_BASE_URL,
  CATEGORIES,
  S3: {
    bucket: process.env.AWS_S3_BUCKET || '',
    region: process.env.AWS_S3_REGION || process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    cdnBaseUrl: (process.env.AWS_CLOUDFRONT_URL || '').replace(/\/$/, ''),
  },
};
