# Media storage architecture

## Overview

Uploads use a **provider abstraction** (`storage/StorageService.js`) so local disk works today and AWS S3 can be enabled later without rewriting controllers.

| Layer | Path |
|--------|------|
| Config | `config/storageConfig.js` |
| Providers | `storage/providers/LocalStorageProvider.js`, `S3StorageProvider.js` |
| Upload pipeline | `middleware/uploadMiddleware.js` → `services/mediaUploadService.js` |
| Audit (optional) | `MediaAssets` table via `services/mediaAssetService.js` |

## Local layout

Files are stored under `UPLOAD_ROOT` (default: `backend/uploads/`):

```
uploads/
  posts/{userId}/{uuid}.ext
  profiles/avatars/{userId}/{uuid}.ext
  profiles/covers/{userId}/{uuid}.ext
  messages/{userId}/{uuid}.ext
  library/{userId}/{uuid}.ext
  jobs/resumes/{userId}/{uuid}.ext
  attachments/{userId}/{uuid}.ext
```

Public URLs: `/media/{storage_key}` (legacy `/uploads/...` still served).

## Environment

```env
STORAGE_PROVIDER=local   # or s3 (requires AWS_* when fully wired)
UPLOAD_ROOT=./uploads
MEDIA_PUBLIC_BASE_PATH=/media
PUBLIC_BASE_URL=https://api.example.com   # optional absolute URLs in API responses
```

## S3 migration (future)

1. Set `STORAGE_PROVIDER=s3` and AWS bucket/CDN env vars.
2. Implement `PutObject` / `DeleteObject` in `S3StorageProvider.js` (stub delegates to local today).
3. Run a one-time migration script to copy `uploads/**` → S3 and rewrite DB URLs / `storage_key` fields.
4. Point `PUBLIC_BASE_URL` or `AWS_CLOUDFRONT_URL` at the CDN.

## API categories

| Category | Route / usage | Max size (default) |
|----------|----------------|-------------------|
| `post` | `POST/PUT /api/posts` field `media` | 25MB × 5 |
| `avatar` | `POST /api/users/profile/avatar` | 5MB |
| `cover` | `POST /api/users/profile/cover` | 8MB |
| `message` | `POST /api/messages/threads/:id/messages` | 20MB |
| `library` | `POST/PUT /api/resource-library` | 50MB |
| `resume` | `POST /api/jobs/:id/apply` | 5MB |
| `attachment` | Global Q&A attachments | 10MB × 5 |

Profile avatar/cover updates **delete the previous file** from storage before saving the new URL.
