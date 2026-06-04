/**
 * AWS S3 storage provider — activate with STORAGE_PROVIDER=s3 and AWS_* env vars.
 */
const fs = require('fs');
const path = require('path');
const LocalStorageProvider = require('./LocalStorageProvider');

let S3Client;
let PutObjectCommand;
let DeleteObjectCommand;

function loadAwsSdk() {
  if (S3Client) return true;
  try {
    const sdk = require('@aws-sdk/client-s3');
    S3Client = sdk.S3Client;
    PutObjectCommand = sdk.PutObjectCommand;
    DeleteObjectCommand = sdk.DeleteObjectCommand;
    return true;
  } catch {
    return false;
  }
}

class S3StorageProvider {
  constructor() {
    const { S3 } = require('../../config/storageConfig');
    this.bucket = S3.bucket;
    this.region = S3.region;
    this.cdnBaseUrl = S3.cdnBaseUrl;
    this.configured =
      Boolean(S3.bucket && S3.accessKeyId && S3.secretAccessKey) && loadAwsSdk();

    this.fallback = new LocalStorageProvider();

    if (process.env.STORAGE_PROVIDER === 's3' && !this.configured) {
      console.warn(
        '[S3Storage] STORAGE_PROVIDER=s3 but AWS SDK or credentials missing — using local fallback.',
      );
    }

    if (this.configured) {
      this.client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: S3.accessKeyId,
          secretAccessKey: S3.secretAccessKey,
        },
      });
    }
  }

  getProviderName() {
    return this.configured ? 's3' : 'local-fallback';
  }

  getPublicPath(storageKey) {
    const key = String(storageKey || '').replace(/^\/+/, '');
    if (!this.configured) return this.fallback.getPublicPath(storageKey);
    if (this.cdnBaseUrl) return `${this.cdnBaseUrl}/${key}`;
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async deleteByKey(storageKey) {
    if (!this.configured) return this.fallback.deleteByKey(storageKey);
    const key = String(storageKey || '').replace(/^\/+/, '');
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async deleteByStoredUrl(storedUrl) {
    if (!this.configured) return this.fallback.deleteByStoredUrl(storedUrl);
    const { storageKeyFromStoredUrl } = require('../utils/mediaPaths');
    const key = storageKeyFromStoredUrl(storedUrl);
    if (key) await this.deleteByKey(key);
  }

  async finalizeMulterFile({ storageKey, absolutePath }) {
    if (!this.configured) return this.fallback.finalizeMulterFile({ storageKey, absolutePath });

    const key = String(storageKey || '').replace(/^\/+/, '');
    const body = fs.readFileSync(absolutePath);
    const ext = path.extname(absolutePath).toLowerCase();
    const contentType =
      ext === '.png'
        ? 'image/png'
        : ext === '.jpg' || ext === '.jpeg'
          ? 'image/jpeg'
          : ext === '.webp'
            ? 'image/webp'
            : ext === '.mp4'
              ? 'video/mp4'
              : ext === '.pdf'
                ? 'application/pdf'
                : 'application/octet-stream';

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
      }),
    );

    try {
      fs.unlinkSync(absolutePath);
    } catch {
      /* temp file may already be gone */
    }

    return { storageKey: key, publicPath: this.getPublicPath(key) };
  }

  resolveAbsolutePath(storageKey) {
    return this.fallback.resolveAbsolutePath(storageKey);
  }
}

module.exports = S3StorageProvider;
