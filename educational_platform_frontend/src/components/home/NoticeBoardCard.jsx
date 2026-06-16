import { ArrowRight, Calendar, Pin } from 'lucide-react';
import {
  formatNoticeDate,
  resolveNoticeCategory,
  resolveNoticeSourceLabel,
} from '@/lib/noticeBoardWidgetUtils';

export default function NoticeBoardCard({
  notice,
  onOpen,
  onCommunityNavigate,
}) {
  const category = resolveNoticeCategory(notice);
  const dateLabel = formatNoticeDate(notice);
  const sourceLabel = resolveNoticeSourceLabel(notice);
  const description = (notice.body || '').trim() || 'No additional details provided.';

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen?.(notice);
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(notice)}
      onKeyDown={handleKeyDown}
      className={[
        'notice-board-card',
        notice.is_pinned ? 'notice-board-card--pinned' : '',
        `notice-board-card--${category.key}`,
      ].filter(Boolean).join(' ')}
    >
      <div className="notice-board-card__header">
        <h4 className="notice-board-card__title">{notice.title || 'Notice'}</h4>
        {notice.is_pinned ? (
          <span className="notice-board-card__pin" aria-label="Pinned notice">
            <Pin className="h-3 w-3" aria-hidden />
          </span>
        ) : null}
      </div>

      <div className="notice-board-card__badges">
        <span className={`notice-board-card__badge notice-board-card__badge--${category.key}`}>
          {category.label}
        </span>
        <span className="notice-board-card__badge notice-board-card__badge--source">
          {sourceLabel}
        </span>
      </div>

      <p className="notice-board-card__description">{description}</p>

      <div className="notice-board-card__meta">
        <span className="notice-board-card__meta-item">
          <Calendar className="notice-board-card__meta-icon" aria-hidden />
          {dateLabel}
        </span>
      </div>

      <div className="notice-board-card__footer">
        <span className="notice-board-card__cta">
          View details
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </span>

        {notice.source === 'community' && notice.community_name ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onCommunityNavigate?.(notice);
            }}
            className="notice-board-card__community-btn"
          >
            Community
          </button>
        ) : null}
      </div>
    </article>
  );
}
