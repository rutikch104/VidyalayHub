import { useCallback, useEffect, useRef, useState } from 'react';
import { Heart, Repeat2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import postService from '@/services/postService';
import PostEngagementPersonRow from '@/components/posts/PostEngagementPersonRow';

const PAGE_SIZE = 20;

function modalMeta(type, total, titleNoun = null) {
  if (type === 'reposts') {
    const noun = titleNoun || 'repost';
    const plural = noun.endsWith('s') ? noun : `${noun}s`;
    return {
      title: total === 1 ? `1 ${noun}` : `${total.toLocaleString()} ${plural}`,
      empty: `No ${plural} yet`,
      Icon: Repeat2,
    };
  }
  return {
    title: total === 1 ? '1 like' : `${total.toLocaleString()} likes`,
    empty: 'No likes yet',
    Icon: Heart,
  };
}

export default function PostEngagementModal({
  open,
  onOpenChange,
  type = 'likes',
  postId,
  totalCount = 0,
  titleNoun = null,
}) {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);

  const meta = modalMeta(type, totalCount, titleNoun);
  const hasMore = page < totalPages;

  const fetchPage = useCallback(
    async (pageNum, append = false) => {
      if (!postId) return;
      const isInitial = pageNum === 1 && !append;
      if (isInitial) setLoading(true);
      else setLoadingMore(true);
      setError('');

      try {
        const result =
          type === 'reposts'
            ? await postService.getPostReposts(postId, { page: pageNum, limit: PAGE_SIZE })
            : await postService.getPostLikes(postId, { page: pageNum, limit: PAGE_SIZE });
        setUsers((prev) => (append ? [...prev, ...result.users] : result.users));
        setPage(result.page);
        setTotalPages(result.totalPages);
      } catch (err) {
        console.error(err);
        setError('Could not load engagement list.');
        if (!append) setUsers([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [postId, type],
  );

  useEffect(() => {
    if (!open || !postId) return;
    setUsers([]);
    setPage(1);
    setTotalPages(1);
    fetchPage(1, false);
  }, [open, postId, type, fetchPage]);

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    fetchPage(page + 1, true);
  };

  const handleScroll = (e) => {
    const el = e.currentTarget;
    if (!hasMore || loadingMore || loading) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 48) {
      handleLoadMore();
    }
  };

  const handlePersonNavigate = () => {
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="post-engagement-modal sm:max-w-md">
        <DialogHeader className="post-engagement-modal__header">
          <div className="post-engagement-modal__title-row">
            <span className="post-engagement-modal__icon-wrap" aria-hidden>
              <meta.Icon className="h-4 w-4" />
            </span>
            <DialogTitle className="post-engagement-modal__title">{meta.title}</DialogTitle>
          </div>
        </DialogHeader>

        <div
          ref={listRef}
          className="post-engagement-modal__list"
          onScroll={handleScroll}
        >
          {loading ? (
            <div className="post-engagement-modal__state">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
              <span>Loading…</span>
            </div>
          ) : error ? (
            <div className="post-engagement-modal__state post-engagement-modal__state--error">
              <p>{error}</p>
              <button type="button" className="post-engagement-modal__retry" onClick={() => fetchPage(1, false)}>
                Try again
              </button>
            </div>
          ) : users.length === 0 ? (
            <div className="post-engagement-modal__state">
              <meta.Icon className="h-8 w-8 text-muted-foreground/50" aria-hidden />
              <p>{meta.empty}</p>
            </div>
          ) : (
            <>
              {users.map((person) => (
                <PostEngagementPersonRow
                  key={person.id}
                  person={person}
                  showRepostedAt={type === 'reposts'}
                  onNavigate={handlePersonNavigate}
                />
              ))}
              {loadingMore ? (
                <div className="post-engagement-modal__load-more">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  <span>Loading more…</span>
                </div>
              ) : hasMore ? (
                <button
                  type="button"
                  className="post-engagement-modal__load-btn"
                  onClick={handleLoadMore}
                >
                  Load more
                </button>
              ) : null}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
