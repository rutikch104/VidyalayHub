// @ts-nocheck
import { Eye, Download, FileText, Video, Presentation } from 'lucide-react';

function FileIcon({ type }) {
  const t = String(type || '').toUpperCase();
  if (t === 'VIDEO') return <Video className="h-5 w-5 text-purple-500" />;
  if (t === 'PPT') return <Presentation className="h-5 w-5 text-orange-500" />;
  if (t === 'PDF') return <FileText className="h-5 w-5 text-red-500" />;
  return <FileText className="h-5 w-5 text-emerald-600" />;
}

function CardStats({ doc }) {
  const views = doc.views ?? doc.views_count ?? 0;
  const downloads = doc.downloads ?? doc.downloads_count ?? 0;

  return (
    <div className="lib-resource-card__stats">
      {doc.fileSize ? (
        <span className="lib-resource-card__stat">{doc.fileSize}</span>
      ) : (
        <span className="lib-resource-card__stat lib-resource-card__stat--placeholder" aria-hidden />
      )}
      <span className="lib-resource-card__stat">
        <Eye className="h-3.5 w-3.5" aria-hidden />
        {views}
      </span>
      <span className="lib-resource-card__stat">
        <Download className="h-3.5 w-3.5" aria-hidden />
        {downloads}
      </span>
    </div>
  );
}

export default function ResourceCard({ doc, viewMode, onPreview }) {
  if (viewMode === 'list') {
    return (
      <article className="lib-resource-card lib-resource-card--list">
        <div className="lib-resource-card__body-wrap">
          <div className="lib-resource-card__identity">
            <div className="lib-resource-card__icon lib-resource-card__icon--sm">
              <FileIcon type={doc.type} />
            </div>
            <div className="lib-resource-card__meta">
              <button type="button" onClick={() => onPreview(doc)} className="w-full text-left">
                <h3 className="lib-resource-card__title line-clamp-2">{doc.title}</h3>
              </button>
              <p className="lib-resource-card__author">{doc.author}</p>
              {doc.date ? <p className="lib-resource-card__meta-line">{doc.date}</p> : null}
              <CardStats doc={doc} />
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onPreview(doc)}
          className="lib-resource-card__view-btn"
        >
          <Eye className="h-4 w-4" aria-hidden />
          View
        </button>
      </article>
    );
  }

  return (
    <article className="lib-resource-card lib-resource-card--grid social-card--interactive">
      <div className="lib-resource-card__identity">
        <div className="lib-resource-card__icon lib-resource-card__icon--sm">
          <FileIcon type={doc.type} />
        </div>
        <div className="lib-resource-card__meta">
          <button type="button" onClick={() => onPreview(doc)} className="w-full text-left">
            <h3 className="lib-resource-card__title line-clamp-2">{doc.title}</h3>
          </button>
          <p className="lib-resource-card__author">{doc.author}</p>
        </div>
      </div>

      <div className="lib-resource-card__details">
        {doc.date ? <p className="lib-resource-card__meta-line">{doc.date}</p> : null}
        <CardStats doc={doc} />
      </div>

      <button
        type="button"
        onClick={() => onPreview(doc)}
        className="lib-resource-card__view-btn lib-resource-card__view-btn--block"
      >
        <Eye className="h-4 w-4" aria-hidden />
        View resource
      </button>
    </article>
  );
}
