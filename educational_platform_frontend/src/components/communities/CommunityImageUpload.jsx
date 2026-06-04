// @ts-nocheck
import { useRef, useState, useCallback } from 'react';
import { ImagePlus, X, Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
const MAX_BYTES_AVATAR = 5 * 1024 * 1024;
const MAX_BYTES_COVER = 8 * 1024 * 1024;

export function validateCommunityImage(file, imageRole = 'avatar') {
  if (!file) return 'No file selected.';
  if (!file.type.startsWith('image/')) {
    return 'Please upload an image file (JPEG, PNG, WebP, or GIF).';
  }
  const maxBytes = imageRole === 'cover' ? MAX_BYTES_COVER : MAX_BYTES_AVATAR;
  const maxLabel = imageRole === 'cover' ? '8 MB' : '5 MB';
  if (file.size > maxBytes) {
    return `Image must be ${maxLabel} or smaller.`;
  }
  return null;
}

export default function CommunityImageUpload({
  label = 'Community logo',
  hint = 'Square image works best. Max 5 MB.',
  previewUrl,
  onFileChange,
  disabled = false,
  uploading = false,
  className,
  variant = 'default',
  imageRole = 'avatar',
  optional = false,
  hideLabel = false,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState('');

  const applyFile = useCallback(
    (file) => {
      const err = validateCommunityImage(file, imageRole);
      if (err) {
        setLocalError(err);
        return;
      }
      setLocalError('');
      onFileChange(file);
    },
    [onFileChange],
  );

  const handleInput = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) applyFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) applyFile(file);
  };

  const clear = (e) => {
    e.stopPropagation();
    setLocalError('');
    onFileChange(null);
  };

  const isCompact = variant === 'compact';
  const isBanner = variant === 'banner' || imageRole === 'cover';
  const isAvatar = variant === 'avatar';

  return (
    <div className={cn('comm-image-upload', hideLabel && 'comm-image-upload--hide-label', className)}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className="text-sm font-semibold text-foreground">
          {label}
          {optional ? (
            <span className="ml-1.5 text-xs font-medium text-muted-foreground">(optional)</span>
          ) : null}
        </label>
        {previewUrl && !uploading && (
          <button
            type="button"
            onClick={clear}
            className="text-xs font-semibold text-muted-foreground transition-colors hover:text-destructive"
          >
            Remove
          </button>
        )}
      </div>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'comm-image-upload__dropzone',
          isCompact && 'comm-image-upload__dropzone--compact',
          isAvatar && 'comm-image-upload__dropzone--avatar',
          dragOver && 'comm-image-upload__dropzone--active',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={handleInput}
          disabled={disabled || uploading}
          aria-label={label}
        />

        {previewUrl ? (
          <div
            className={cn(
              'comm-image-upload__preview',
              isBanner && 'comm-image-upload__preview--banner',
            )}
          >
            <img src={previewUrl} alt="" className="comm-image-upload__preview-img" />
            {uploading ? (
              <span className="comm-image-upload__overlay">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </span>
            ) : (
              <span className="comm-image-upload__overlay comm-image-upload__overlay--hover">
                <Upload className="h-5 w-5 text-white" />
                <span className="text-xs font-semibold text-white">Change</span>
              </span>
            )}
          </div>
        ) : (
          <div className="comm-image-upload__placeholder">
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            ) : (
              <>
                <span className="comm-image-upload__icon-wrap">
                  <ImagePlus className="h-5 w-5 text-emerald-600" />
                </span>
                <p className="text-sm font-semibold text-foreground">
                  {isAvatar ? 'Add logo' : isCompact ? 'Upload logo' : 'Drop image here or click to browse'}
                </p>
                <p className="text-xs text-muted-foreground">{hint}</p>
              </>
            )}
          </div>
        )}
      </div>

      {localError ? (
        <p className="mt-1.5 text-xs font-medium text-destructive" role="alert">
          {localError}
        </p>
      ) : null}
    </div>
  );
}

