import { BellRing, ChevronRight, Loader2 } from 'lucide-react';
import NoticeBoardCard from '@/components/home/NoticeBoardCard';
import {
  NOTICE_BOARD_LIMIT,
  sortNotices,
} from '@/lib/noticeBoardWidgetUtils';

function NoticeSkeleton() {
  return (
    <div className="notice-board-widget__skeleton" aria-hidden>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="notice-board-widget__skeleton-row" />
      ))}
    </div>
  );
}

function NoticeEmptyState({ onOpenCenter }) {
  return (
    <div className="notice-board-widget__empty">
      <div className="notice-board-widget__empty-icon">
        <BellRing className="h-6 w-6" aria-hidden />
      </div>
      <p className="notice-board-widget__empty-title">No notices available</p>
      <p className="notice-board-widget__empty-text">
        Official college updates and campus announcements will appear here when published.
      </p>
      <button type="button" onClick={onOpenCenter} className="notice-board-widget__empty-cta">
        Open notice center
      </button>
    </div>
  );
}

export default function NoticeBoardWidget({
  notices = [],
  loading = false,
  onOpenNotice,
  onViewAll,
  onCommunityNavigate,
}) {
  const sorted = sortNotices(notices).slice(0, NOTICE_BOARD_LIMIT);
  const showViewAll = notices.length >= NOTICE_BOARD_LIMIT;

  if (loading) {
    return (
      <div className="notice-board-widget">
        <div className="flex items-center justify-center py-5">
          <Loader2 className="h-5 w-5 animate-spin text-orange-600" aria-label="Loading notices" />
        </div>
        <NoticeSkeleton />
      </div>
    );
  }

  if (sorted.length === 0) {
    return <NoticeEmptyState onOpenCenter={onViewAll} />;
  }

  return (
    <div className="notice-board-widget">
      <div className="notice-board-widget__list">
        {sorted.map((notice) => (
          <NoticeBoardCard
            key={notice.id}
            notice={notice}
            onOpen={onOpenNotice}
            onCommunityNavigate={onCommunityNavigate}
          />
        ))}
      </div>

      {showViewAll ? (
        <button type="button" onClick={onViewAll} className="notice-board-widget__view-all">
          View all notices
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
