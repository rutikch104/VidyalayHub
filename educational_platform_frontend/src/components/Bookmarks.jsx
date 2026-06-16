// @ts-nocheck
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bookmark,
  Search,
  Grid,
  List,
  MessageCircle,
  User,
  Star,
  Trash2,
  BookOpen,
  FileText,
  Loader2,
  Sparkles,
  Users,
  Briefcase,
  Clock,
  X,
} from 'lucide-react';
import bookmarkService from '@/services/bookmarkService';
import PageHeader from '@/components/ui/PageHeader';
import ModuleFeedTabs from '@/components/ui/ModuleFeedTabs';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmActionDialog from '@/components/ui/ConfirmActionDialog';
import { CONFIRM_ACTION_PRESETS } from '@/components/ui/confirmActionPresets';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All', icon: Bookmark },
  { value: 'post', label: 'Posts', icon: FileText },
  { value: 'community_post', label: 'Community', icon: Users },
  { value: 'job', label: 'Jobs', icon: Briefcase },
  { value: 'comment', label: 'Comments', icon: MessageCircle },
  { value: 'question', label: 'Questions', icon: Star },
  { value: 'resource', label: 'Resources', icon: BookOpen },
];

const TYPE_LABELS = {
  post: 'Post',
  community_post: 'Community post',
  job: 'Job',
  comment: 'Comment',
  question: 'Question',
  answer: 'Answer',
  resource: 'Resource',
  course: 'Course',
  event: 'Event',
};

function itemAuthorLine(item) {
  if (!item) return null;
  const u = item.user || item.author || item.asker || item.answerer || item.uploader;
  if (!u) return null;
  if (u.name) return String(u.name);
  const n = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  return n || null;
}

function bookmarkTitle(bookmark) {
  const item = bookmark.item;
  if (!item) return 'Unavailable (content removed)';
  if (bookmark.type === 'community_post' && item.community?.name) {
    const t = item.title?.trim() || item.content?.trim()?.slice(0, 60) || 'Community post';
    return `${item.community.name}: ${t}`;
  }
  const t = item.title;
  if (typeof t === 'string' && t.trim()) return t;
  const c = item.content;
  if (typeof c === 'string' && c.trim()) {
    const s = c.trim();
    return s.length > 80 ? `${s.slice(0, 80)}…` : s;
  }
  return 'Saved item';
}

function bookmarkTypeLabel(type) {
  return TYPE_LABELS[type] || String(type || 'Item').replace(/_/g, ' ');
}

function bookmarkSnippet(item) {
  if (!item) return null;
  if (typeof item.description === 'string' && item.description.trim()) {
    return item.description.trim();
  }
  if (typeof item.content === 'string' && item.content.trim()) {
    return item.content.trim();
  }
  return null;
}

function getItemIcon(type) {
  switch (type) {
    case 'post':
      return FileText;
    case 'community_post':
      return Users;
    case 'job':
      return Briefcase;
    case 'question':
      return Star;
    case 'comment':
      return MessageCircle;
    case 'answer':
      return Star;
    case 'resource':
      return BookOpen;
    default:
      return Bookmark;
  }
}

function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
}

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page: 1, limit: 50 };
      if (selectedFilter !== 'all') params.type = selectedFilter;
      const response = await bookmarkService.getUserBookmarks(params);
      setBookmarks(response.bookmarks || []);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (err instanceof Error ? err.message : undefined);
      setError(msg || 'Failed to fetch bookmarks');
      setBookmarks([]);
    } finally {
      setLoading(false);
    }
  }, [selectedFilter]);

  useEffect(() => {
    void fetchBookmarks();
  }, [fetchBookmarks]);

  useEffect(() => {
    const onChanged = () => void fetchBookmarks();
    window.addEventListener('app:bookmarks-changed', onChanged);
    return () => window.removeEventListener('app:bookmarks-changed', onChanged);
  }, [fetchBookmarks]);

  const openDeleteConfirm = (bookmark) => {
    setDeleteError('');
    setDeleteTarget({
      id: bookmark.id,
      title: bookmarkTitle(bookmark),
    });
  };

  const closeDeleteConfirm = () => {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteError('');
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await bookmarkService.deleteBookmark(deleteTarget.id);
      setBookmarks((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (err instanceof Error ? err.message : undefined);
      setDeleteError(msg || 'Failed to remove bookmark. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredBookmarks = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return bookmarks;
    return bookmarks.filter((bookmark) => {
      const item = bookmark.item;
      if (!item) return false;
      const title = typeof item.title === 'string' ? item.title : '';
      const content = typeof item.content === 'string' ? item.content : '';
      const description = typeof item.description === 'string' ? item.description : '';
      return (
        title.toLowerCase().includes(q) ||
        content.toLowerCase().includes(q) ||
        description.toLowerCase().includes(q)
      );
    });
  }, [bookmarks, searchTerm]);

  const renderBookmarkCard = (bookmark) => {
    const item = bookmark.item;
    const author = itemAuthorLine(item);
    const ItemIcon = getItemIcon(bookmark.type);
    const snippet = bookmarkSnippet(item);
    const isList = viewMode === 'list';

    return (
      <article
        key={bookmark.id}
        className={['bookmark-card', isList ? 'bookmark-card--list' : ''].join(' ')}
      >
        <div className="bookmark-card__main">
          <div className="bookmark-card__body-wrap">
            <div className="bookmark-card__head">
              <div className="bookmark-card__identity">
                <div className="bookmark-card__icon" aria-hidden>
                  <ItemIcon className="h-5 w-5" />
                </div>
                <div className="bookmark-card__meta">
                  <h3 className="bookmark-card__title">{bookmarkTitle(bookmark)}</h3>
                  <span className="bookmark-card__type">{bookmarkTypeLabel(bookmark.type)}</span>
                </div>
              </div>
              <div className="bookmark-card__actions">
                <button
                  type="button"
                  onClick={() => openDeleteConfirm(bookmark)}
                  className="bookmark-card__remove"
                  aria-label={`Remove bookmark: ${bookmarkTitle(bookmark)}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {snippet ? <p className="bookmark-card__body">{snippet}</p> : null}

            {item && Array.isArray(item.hashtags) && item.hashtags.length > 0 ? (
              <div className="bookmark-card__tags">
                {item.hashtags.slice(0, 3).map((tag) => (
                  <span key={tag} className="bookmark-card__tag">
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="bookmark-card__footer">
            <span className="bookmark-card__saved">
              <Clock className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              Saved {formatTimeAgo(bookmark.created_at)}
            </span>
            {author ? (
              <span className="bookmark-card__author" title={author}>
                <User className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                {author}
              </span>
            ) : null}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="platform-page">
      <div className="platform-page__container bm-page-stack">
        <PageHeader
          icon={Sparkles}
          badge="Your saved library"
          title="Bookmarks"
          description="Posts, questions, resources, and more — everything you've saved in one place."
          variant="violet"
        />

        <div className="bm-feed-tabs">
          <ModuleFeedTabs
            shellClassName="bm-feed-tabs__shell"
            className="bm-feed-tabs__tabs"
            tabs={FILTER_OPTIONS.map((opt) => ({
              key: opt.value,
              label: opt.label,
              icon: opt.icon,
            }))}
            activeKey={selectedFilter}
            onChange={setSelectedFilter}
            ariaLabel="Filter bookmarks"
          />
        </div>

        <div className="platform-toolbar">
          <div className="bm-toolbar-row">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60"
                aria-hidden
              />
              <input
                type="search"
                placeholder="Search bookmarks…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="platform-search"
                aria-label="Search bookmarks"
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </div>
            <div className="platform-view-toggle platform-view-toggle--violet shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`platform-view-toggle__btn ${viewMode === 'grid' ? 'platform-view-toggle__btn--active' : ''}`}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`platform-view-toggle__btn ${viewMode === 'list' ? 'platform-view-toggle__btn--active' : ''}`}
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div
            className="flex items-start justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/[0.06] px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              className="shrink-0 text-destructive/70 hover:text-destructive"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {!loading && filteredBookmarks.length > 0 ? (
          <div className="bm-content-chrome">
            <p className="bm-content-chrome__count">
              {filteredBookmarks.length} saved item{filteredBookmarks.length === 1 ? '' : 's'}
              {searchTerm.trim() ? ` matching “${searchTerm.trim()}”` : ''}
            </p>
          </div>
        ) : null}

        <div
          className={[
            viewMode === 'grid' ? 'bm-grid platform-stagger' : 'bm-list platform-stagger',
          ].join(' ')}
        >
          {loading ? (
            <div className="bm-content-status">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" aria-label="Loading bookmarks" />
            </div>
          ) : filteredBookmarks.length === 0 ? (
            <EmptyState
              className={viewMode === 'grid' ? 'col-span-full' : 'w-full'}
              icon={Bookmark}
              title={searchTerm.trim() ? 'No matching bookmarks' : 'No bookmarks yet'}
              description={
                searchTerm.trim()
                  ? 'Try a different search term or filter to find what you saved.'
                  : 'Start saving content you want to revisit from posts, library, jobs, or communities.'
              }
            />
          ) : (
            filteredBookmarks.map(renderBookmarkCard)
          )}
        </div>
      </div>

      <ConfirmActionDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) closeDeleteConfirm();
        }}
        title={CONFIRM_ACTION_PRESETS.removeBookmark.title}
        description={CONFIRM_ACTION_PRESETS.removeBookmark.description}
        confirmLabel={CONFIRM_ACTION_PRESETS.removeBookmark.confirmLabel}
        tone={CONFIRM_ACTION_PRESETS.removeBookmark.tone}
        icon={CONFIRM_ACTION_PRESETS.removeBookmark.icon}
        loading={deleting}
        loadingLabel="Removing…"
        error={deleteError}
        contextPreview={deleteTarget?.title}
        onConfirm={confirmDelete}
        onCancel={closeDeleteConfirm}
      />
    </div>
  );
}
