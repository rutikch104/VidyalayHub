// @ts-nocheck
import {
  Bookmark,
  Download,
  Eye,
  FileText,
  Presentation,
  Share2,
  Sparkles,
  Video,
} from 'lucide-react';
import { formatCompactCount, isResourceFeatured } from './libraryUtils';

const TYPE_META = {
  PDF: { label: 'PDF', hero: 'pdf', icon: FileText },
  VIDEO: { label: 'Video', hero: 'video', icon: Video },
  PPT: { label: 'PPT', hero: 'ppt', icon: Presentation },
  DEFAULT: { label: 'File', hero: 'default', icon: FileText },
};

function resolveTypeMeta(type) {
  const key = String(type || '').toUpperCase();
  if (TYPE_META[key]) return TYPE_META[key];
  return { ...TYPE_META.DEFAULT, label: key || 'File' };
}

function authorInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function ResourceTypeIcon({ type, className = 'h-5 w-5' }) {
  const meta = resolveTypeMeta(type);
  const Icon = meta.icon;
  return <Icon className={className} aria-hidden />;
}

function EngagementStats({ doc }) {
  const views = doc.views ?? doc.views_count ?? 0;
  const downloads = doc.downloads ?? doc.downloads_count ?? 0;

  return (
    <>
      <span className="lib-resource-card__engagement-stat">
        <Eye className="h-3.5 w-3.5" aria-hidden />
        {formatCompactCount(views)} views
      </span>
      <span className="lib-resource-card__engagement-stat">
        <Download className="h-3.5 w-3.5" aria-hidden />
        {formatCompactCount(downloads)} downloads
      </span>
    </>
  );
}

export default function ResourceCard({
  doc,
  viewMode,
  onPreview,
  onDownload,
  onBookmark,
  isBookmarked = false,
  isFeatured: isFeaturedProp,
}) {
  const typeMeta = resolveTypeMeta(doc.type);
  const featured = isFeaturedProp ?? isResourceFeatured(doc);

  const handleShare = async (e) => {
    e.stopPropagation();
    const url = doc.fileUrl || window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: doc.title, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* user cancelled or unsupported */
    }
  };

  if (viewMode === 'list') {
    return (
      <article className="lib-resource-card lib-resource-card--lovable lib-resource-card--list">
        <div className={`lib-resource-card__hero lib-resource-card__hero--${typeMeta.hero} lib-resource-card__hero--compact`}>
          <span className="lib-resource-card__type-pill">
            <ResourceTypeIcon type={doc.type} className="h-3.5 w-3.5" />
            {typeMeta.label}
          </span>
        </div>

        <div className="lib-resource-card__list-main">
          <div className="lib-resource-card__list-head">
            <div className="min-w-0 flex-1">
              <button type="button" onClick={() => onPreview(doc)} className="w-full text-left">
                <h3 className="lib-resource-card__title">{doc.title}</h3>
              </button>
              <p className="lib-resource-card__author-inline">{doc.author}</p>
            </div>
            <div className="lib-resource-card__list-badges">
              {featured ? (
                <span className="lib-resource-card__featured">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  Featured
                </span>
              ) : null}
              {onBookmark ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBookmark(doc);
                  }}
                  className={`lib-resource-card__bookmark${isBookmarked ? ' lib-resource-card__bookmark--active' : ''}`}
                  aria-label={isBookmarked ? 'Remove bookmark' : 'Save resource'}
                >
                  <Bookmark className={`h-4 w-4${isBookmarked ? ' fill-current' : ''}`} />
                </button>
              ) : null}
            </div>
          </div>

          <div className="lib-resource-card__list-meta">
            {doc.date ? <span>{doc.date}</span> : null}
            <EngagementStats doc={doc} />
          </div>
        </div>

        <div className="lib-resource-card__list-actions">
          <button type="button" onClick={() => onPreview(doc)} className="lib-resource-card__btn-preview">
            <Eye className="h-4 w-4" aria-hidden />
            Preview
          </button>
          <button
            type="button"
            onClick={() => onDownload?.(doc)}
            className="lib-resource-card__btn-download"
          >
            <Download className="h-4 w-4" aria-hidden />
            Download
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="lib-resource-card lib-resource-card--lovable lib-resource-card--grid">
      <div className={`lib-resource-card__hero lib-resource-card__hero--${typeMeta.hero}`}>
        <div className="lib-resource-card__hero-top">
          <span className="lib-resource-card__type-pill">
            <ResourceTypeIcon type={doc.type} className="h-3.5 w-3.5" />
            {typeMeta.label}
          </span>
          <div className="lib-resource-card__hero-actions">
            {featured ? (
              <span className="lib-resource-card__featured">
                <Sparkles className="h-3 w-3" aria-hidden />
                Featured
              </span>
            ) : null}
            {onBookmark ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onBookmark(doc);
                }}
                className={`lib-resource-card__bookmark${isBookmarked ? ' lib-resource-card__bookmark--active' : ''}`}
                aria-label={isBookmarked ? 'Remove bookmark' : 'Save resource'}
              >
                <Bookmark className={`h-4 w-4${isBookmarked ? ' fill-current' : ''}`} />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="lib-resource-card__body">
        <button type="button" onClick={() => onPreview(doc)} className="w-full text-left">
          <h3 className="lib-resource-card__title">{doc.title}</h3>
        </button>

        <div className="lib-resource-card__author-row">
          <div className="lib-resource-card__author-avatar" aria-hidden>
            {doc.avatar ? (
              <img src={doc.avatar} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              authorInitials(doc.author)
            )}
          </div>
          <div className="min-w-0">
            <p className="lib-resource-card__author-name">{doc.author}</p>
            <p className="lib-resource-card__author-meta">
              {doc.date ? `Uploaded ${doc.date}` : 'Shared resource'}
            </p>
          </div>
        </div>

        <div className="lib-resource-card__engagement">
          <div className="lib-resource-card__engagement-stats">
            <EngagementStats doc={doc} />
          </div>
          <div className="lib-resource-card__engagement-actions">
            <button
              type="button"
              className="lib-resource-card__icon-btn"
              onClick={handleShare}
              aria-label="Share resource"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="lib-resource-card__actions">
          <button type="button" onClick={() => onPreview(doc)} className="lib-resource-card__btn-preview">
            <Eye className="h-4 w-4" aria-hidden />
            Preview
          </button>
          <button
            type="button"
            onClick={() => onDownload?.(doc)}
            className="lib-resource-card__btn-download"
          >
            <Download className="h-4 w-4" aria-hidden />
            Download
          </button>
        </div>
      </div>
    </article>
  );
}
