import { useState, useCallback, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import postService from '@/services/postService';
import { emitNotificationsChanged } from '@/services/notificationService';
import PlatformTabs from '@/components/ui/PlatformTabs';
import CommentComposer from '@/components/comments/CommentComposer';
import CommentItem from '@/components/comments/CommentItem';
import CommentSkeleton from '@/components/comments/CommentSkeleton';
import { COPY } from '@/lib/copy';

const SORT_OPTIONS = [
  { id: 'latest', label: COPY.comments.sort.latest },
  { id: 'top', label: COPY.comments.sort.top },
  { id: 'oldest', label: COPY.comments.sort.oldest },
];

function updateCommentInTree(list, commentId, updater) {
  return list.map((c) => {
    if (String(c.id) === String(commentId)) return updater(c);
    if (c.replies?.length) {
      return { ...c, replies: updateCommentInTree(c.replies, commentId, updater) };
    }
    return c;
  });
}

function removeCommentFromTree(list, commentId) {
  return list
    .filter((c) => String(c.id) !== String(commentId))
    .map((c) => ({
      ...c,
      replies: c.replies ? removeCommentFromTree(c.replies, commentId) : [],
    }));
}

function countSubtreeInTree(list, commentId) {
  for (const c of list) {
    if (String(c.id) === String(commentId)) {
      const walk = (node) =>
        1 + (node.replies || []).reduce((n, r) => n + walk(r), 0);
      return walk(c);
    }
    const inReplies = countSubtreeInTree(c.replies || [], commentId);
    if (inReplies) return inReplies;
  }
  return 1;
}

function prependReplyToTree(list, parentId, newComment) {
  return list.map((c) => {
    if (String(c.id) === String(parentId)) {
      return { ...c, replies: [newComment, ...(c.replies || [])] };
    }
    if (c.replies?.length) {
      return { ...c, replies: prependReplyToTree(c.replies, parentId, newComment) };
    }
    return c;
  });
}

export default function CommentSection({
  postId,
  postOwnerId,
  commentsCount = 0,
  onCommentsCountChange,
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [sort, setSort] = useState('latest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [mainText, setMainText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [likingId, setLikingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const loadComments = useCallback(
    async (opts = {}) => {
      const nextPage = opts.page ?? 1;
      const nextSort = opts.sort ?? sort;
      const append = opts.append ?? false;
      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setError('');
      }
      try {
        const res = await postService.getComments(postId, {
          page: nextPage,
          limit: 15,
          sort: nextSort,
        });
        setComments((prev) => (append ? [...prev, ...res.comments] : res.comments));
        setPage(res.page);
        setTotalPages(res.totalPages);
        if (opts.sort) setSort(nextSort);
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || 'Failed to load comments');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [postId, sort],
  );

  useEffect(() => {
    void loadComments({ page: 1, sort });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const handleSortChange = (nextSort) => {
    setSort(nextSort);
    void loadComments({ sort: nextSort, page: 1 });
  };

  const handleMainSubmit = async (payload) => {
    const content = (payload?.content ?? mainText).trim();
    if (!content || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await postService.addComment(postId, content);
      setMainText('');
      onCommentsCountChange?.(commentsCount + 1);
      await loadComments({ page: 1, sort });
      emitNotificationsChanged();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId, text) => {
    const created = await postService.addReply(postId, parentId, text);
    setComments((prev) => prependReplyToTree(prev, parentId, created));
    onCommentsCountChange?.(commentsCount + 1);
    emitNotificationsChanged();
  };

  const handleEdit = async (commentId, text) => {
    setSavingId(commentId);
    try {
      const updated = await postService.updateComment(postId, commentId, text);
      setComments((prev) =>
        updateCommentInTree(prev, commentId, (c) => ({ ...c, ...updated, replies: c.replies })),
      );
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update comment');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (commentId) => {
    setDeletingId(commentId);
    const removed = countSubtreeInTree(comments, commentId);
    try {
      await postService.deleteComment(postId, commentId);
      setComments((prev) => removeCommentFromTree(prev, commentId));
      onCommentsCountChange?.(Math.max(0, commentsCount - removed));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to delete comment');
    } finally {
      setDeletingId(null);
    }
  };

  const handleLike = async (commentId) => {
    setLikingId(commentId);
    try {
      const res = await postService.toggleCommentLike(postId, commentId);
      setComments((prev) =>
        updateCommentInTree(prev, commentId, (c) => ({
          ...c,
          is_liked: res.is_liked,
          likes_count: res.likes_count,
        })),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLikingId(null);
    }
  };

  return (
    <section className="comment-section" aria-label="Comments">
      <div className="comment-section-header">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground sm:text-base">
          <MessageCircle className="h-4 w-4 text-primary" />
          {COPY.comments.title}
          {commentsCount > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {commentsCount}
            </span>
          )}
        </h4>
        <PlatformTabs
          tabs={SORT_OPTIONS.map((opt) => ({ key: opt.id, label: opt.label }))}
          activeKey={sort}
          onChange={handleSortChange}
          ariaLabel="Sort comments"
          size="compact"
        />
      </div>

      <CommentComposer
        value={mainText}
        onChange={setMainText}
        onSubmit={handleMainSubmit}
        submitting={submitting}
      />

      {error && (
        <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive sm:text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <CommentSkeleton rows={3} />
      ) : comments.length === 0 ? (
        <div className="comment-empty">
          <MessageCircle className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-semibold text-foreground sm:text-base">{COPY.comments.emptyTitle}</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">{COPY.comments.emptyBody}</p>
        </div>
      ) : (
        <>
          <div className="comment-thread">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postId={postId}
                postOwnerId={postOwnerId}
                currentUserId={user?.id}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onLike={handleLike}
                likingId={likingId}
                deletingId={deletingId}
                savingId={savingId}
              />
            ))}
          </div>
          {page < totalPages && (
            <button
              type="button"
              className="comment-load-more"
              disabled={loadingMore}
              onClick={() => loadComments({ page: page + 1, append: true })}
            >
              {loadingMore ? 'Loading…' : COPY.comments.loadMore}
            </button>
          )}
        </>
      )}
    </section>
  );
}
