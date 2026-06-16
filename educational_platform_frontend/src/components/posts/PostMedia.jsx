import React, { useCallback, useState } from 'react';
import { Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizeMediaUrls } from '@/services/postService';
import ImageLightbox from '@/components/communities/ImageLightbox';

function resolveOrientation(naturalWidth, naturalHeight) {
  if (!naturalWidth || !naturalHeight) return 'landscape';
  const ratio = naturalWidth / naturalHeight;
  if (ratio > 1.05) return 'landscape';
  if (ratio < 0.95) return 'portrait';
  return 'square';
}

function PostMediaImage({ src, alt, isSingle, onClick }) {
  const [orientation, setOrientation] = useState('landscape');

  const handleLoad = useCallback((event) => {
    const img = event.currentTarget;
    setOrientation(resolveOrientation(img.naturalWidth, img.naturalHeight));
  }, []);

  const img = (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      sizes="(max-width: 639px) 100vw, 640px"
      onLoad={handleLoad}
      className={cn(
        'feed-post__media-img',
        isSingle && `feed-post__media-img--${orientation}`,
      )}
      onError={(event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.alt = 'Image could not be loaded';
      }}
    />
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={cn(
          'feed-post__media-cell',
          'feed-post__media-cell--clickable',
          isSingle && 'feed-post__media-cell--single',
        )}
        onClick={onClick}
        aria-label="View full image"
      >
        {img}
      </button>
    );
  }

  return (
    <div className={cn('feed-post__media-cell', isSingle && 'feed-post__media-cell--single')}>
      {img}
    </div>
  );
}

function PostMediaItem({ media, isSingle, onImageClick }) {
  const { url, type } = media;
  if (!url) return null;

  const isVideo =
    type === 'video' || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
  const isImage =
    !isVideo &&
    (type === 'image' ||
      /\.(jpg|jpeg|png|gif|webp|svg|heic|heif|bmp)(\?|$)/i.test(url));

  if (isImage) {
    return (
      <PostMediaImage
        src={url}
        alt="Post media"
        isSingle={isSingle}
        onClick={onImageClick}
      />
    );
  }

  if (isVideo) {
    return (
      <div className="feed-post__media-cell feed-post__media-cell--video">
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          className="feed-post__media-video"
        />
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="feed-post__attachment feed-post__media-cell"
    >
      <Paperclip className="h-4 w-4 shrink-0" />
      View attachment
      {media.metadata?.originalName ? `: ${media.metadata.originalName}` : ''}
    </a>
  );
}

export default function PostMedia({ mediaUrls, className, enableLightbox = true }) {
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const items = normalizeMediaUrls(mediaUrls).filter((item) => item.url);
  if (!items.length) return null;

  const count = items.length;
  const isSingle = count === 1;
  const visible = items.slice(0, 4);
  const extraCount = count > 4 ? count - 4 : 0;

  const imageClick = (url) => {
    if (enableLightbox) setLightboxSrc(url);
  };

  return (
    <>
      <div
        className={cn(
          'feed-post__media',
          isSingle
            ? 'feed-post__media--single'
            : `feed-post__media-grid feed-post__media-grid--${Math.min(count, 4)}`,
          className,
        )}
      >
        {visible.map((media, idx) => {
          const isLast = idx === visible.length - 1;
          const overlay = extraCount > 0 && isLast ? extraCount : 0;
          const isImage =
            media.type === 'image' ||
            /\.(jpg|jpeg|png|gif|webp|svg|heic|heif|bmp)(\?|$)/i.test(media.url);

          const item = (
            <PostMediaItem
              media={media}
              isSingle={isSingle}
              onImageClick={isImage && enableLightbox ? () => imageClick(media.url) : undefined}
            />
          );

          if (isSingle) {
            return <React.Fragment key={`${media.url}-${idx}`}>{item}</React.Fragment>;
          }

          return (
            <div key={`${media.url}-${idx}`} className="feed-post__media-grid-item">
              {item}
              {overlay > 0 ? (
                <div className="feed-post__media-more" aria-hidden>
                  +{overlay}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {lightboxSrc ? (
        <ImageLightbox src={lightboxSrc} alt="" onClose={() => setLightboxSrc(null)} />
      ) : null}
    </>
  );
}
