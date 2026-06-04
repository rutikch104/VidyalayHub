// @ts-nocheck
import { useEffect } from 'react';
import {
  X,
  Download,
  Eye,
  Heart,
  Bookmark,
  Flag,
  Building2,
  Tag,
  User,
  Calendar,
  HardDrive,
  Layers,
  FileText,
} from 'lucide-react';
import ResourcePdfViewer from './ResourcePdfViewer';

function MetaChip({ icon: Icon, label, value }) {
  if (value == null || value === '') return null;
  return (
    <div className="lib-preview-modal__chip">
      <Icon className="lib-preview-modal__chip-icon" aria-hidden />
      <div className="min-w-0">
        <p className="lib-preview-modal__chip-label">{label}</p>
        <p className="lib-preview-modal__chip-value">{value}</p>
      </div>
    </div>
  );
}

export default function ResourcePreviewModal({
  doc,
  onClose,
  onDownload,
  onLike,
  onBookmark,
  onReport,
  isBookmarked,
}) {
  useEffect(() => {
    if (!doc) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [doc, onClose]);

  if (!doc) return null;

  const tags = Array.isArray(doc.tags) ? doc.tags : [];
  const subject = doc.subject || 'General';
  const views = doc.views ?? doc.views_count ?? 0;
  const downloads = doc.downloads ?? doc.downloads_count ?? 0;

  return (
    <div className="lib-preview-modal" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="lib-preview-title">
      <div className="lib-preview-modal__dialog" onClick={(e) => e.stopPropagation()}>
        <header className="lib-preview-modal__header">
          <div className="lib-preview-modal__header-main min-w-0 flex-1">
            <div className="lib-preview-modal__type-badge">
              <FileText className="h-3.5 w-3.5" aria-hidden />
              {doc.type || 'PDF'}
            </div>
            <h2 id="lib-preview-title" className="lib-preview-modal__title">
              {doc.title}
            </h2>
            <div className="lib-preview-modal__author-row">
              {doc.avatar ? (
                <img src={doc.avatar} alt="" className="lib-preview-modal__avatar" />
              ) : (
                <div className="lib-preview-modal__avatar lib-preview-modal__avatar--fallback">
                  <User className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0">
                <p className="lib-preview-modal__author-name">{doc.author}</p>
                {doc.college ? <p className="lib-preview-modal__author-meta">{doc.college}</p> : null}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="lib-preview-modal__close" aria-label="Close preview">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="lib-preview-modal__body">
          <aside className="lib-preview-modal__details">
            <div className="lib-preview-modal__chip-grid">
              <MetaChip icon={Calendar} label="Uploaded" value={doc.date} />
              <MetaChip icon={HardDrive} label="Size" value={doc.fileSize} />
              <MetaChip icon={Layers} label="Category" value={subject} />
              <MetaChip icon={Eye} label="Views" value={String(views)} />
              <MetaChip icon={Download} label="Downloads" value={String(downloads)} />
              <MetaChip icon={Building2} label="Institution" value={doc.college} />
            </div>

            {doc.description ? (
              <section className="lib-preview-modal__section">
                <h3 className="lib-preview-modal__section-title">Description</h3>
                <p className="lib-preview-modal__desc">{doc.description}</p>
              </section>
            ) : null}

            {tags.length > 0 ? (
              <section className="lib-preview-modal__section">
                <h3 className="lib-preview-modal__section-title">Tags</h3>
                <div className="lib-preview-modal__tags">
                  {tags.map((tag) => (
                    <span key={tag} className="lib-preview-modal__tag">
                      <Tag className="h-3 w-3" aria-hidden />
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="lib-preview-modal__actions">
              <button
                type="button"
                onClick={() => onLike?.(doc)}
                className={[
                  'lib-preview-modal__action-btn',
                  doc.is_liked ? 'lib-preview-modal__action-btn--liked' : '',
                ].join(' ')}
              >
                <Heart className={`h-4 w-4 ${doc.is_liked ? 'fill-current' : ''}`} />
                {doc.likes ?? 0}
              </button>
              <button
                type="button"
                onClick={() => onBookmark?.(doc)}
                className={[
                  'lib-preview-modal__action-btn',
                  isBookmarked ? 'lib-preview-modal__action-btn--saved' : '',
                ].join(' ')}
              >
                <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                Save
              </button>
              <button
                type="button"
                onClick={() => onReport?.(doc)}
                className="lib-preview-modal__action-btn lib-preview-modal__action-btn--report"
              >
                <Flag className="h-4 w-4" />
                Report
              </button>
            </div>
          </aside>

          <div className="lib-preview-modal__viewer-panel">
            <ResourcePdfViewer doc={doc} />
          </div>
        </div>

        <footer className="lib-preview-modal__footer">
          <button type="button" onClick={onClose} className="lib-preview-modal__btn lib-preview-modal__btn--ghost">
            Close
          </button>
          <button
            type="button"
            onClick={() => onDownload(doc)}
            className="lib-preview-modal__btn lib-preview-modal__btn--primary"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </footer>
      </div>
    </div>
  );
}
