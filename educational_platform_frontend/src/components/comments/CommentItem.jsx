import { useState, useRef, useEffect } from 'react';
import { Heart, MoreHorizontal, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import RichPostText from '@/components/RichPostText';
import CommentComposer from '@/components/comments/CommentComposer';
import { COPY } from '@/lib/copy';
import ClickableUser from '@/components/ui/ClickableUser';
import { PRESENCE_STATUS } from '@/lib/presence';

const FALLBACK_AVATAR =
  'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150';

function formatTimeAgo(dateString) {
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo`;
  return `${Math.floor(diff / 31536000)}y`;
}

function countAllReplies(comment) {
  const replies = comment.replies || [];
  return replies.reduce((n, r) => n + 1 + countAllReplies(r), 0);
}

export default function CommentItem({
  comment,
  depth = 0,
  postId,
  postOwnerId,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onLike,
  likingId,
  deletingId,
  savingId,
}) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [menuOpen, setMenuOpen] = useState(false);
  const [repliesExpanded, setRepliesExpanded] = useState(depth < 1);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef(null);

  const replies = comment.replies || [];
  const replyCount = countAllReplies(comment);
  const isAuthor = currentUserId && String(comment.user?.id) === String(currentUserId);
  const canDelete =
    isAuthor || (postOwnerId && String(postOwnerId) === String(currentUserId));
  const canEdit = isAuthor;
  const isNested = depth > 0;
  const maxNest = 3;

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  useEffect(() => {
    if (!editing) setEditText(comment.text);
  }, [comment.text, editing]);

  const handleReplySubmit = async (payload) => {
    const text = (payload?.content ?? replyText).trim();
    if (!text || submittingReply) return;
    setSubmittingReply(true);
    try {
      await onReply?.(comment.id, text);
      setReplyText('');
      setShowReply(false);
      setRepliesExpanded(true);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleSaveEdit = async () => {
    const t = editText.trim();
    if (!t) return;
    await onEdit?.(comment.id, t);
    setEditing(false);
    setMenuOpen(false);
  };

  const handleDelete = async () => {
    await onDelete?.(comment.id);
    setConfirmDelete(false);
    setMenuOpen(false);
  };

  const edited =
    comment.updated_at &&
    comment.created_at &&
    new Date(comment.updated_at).getTime() - new Date(comment.created_at).getTime() > 2000;

  return (
    <article
      className={`comment-item ${isNested ? 'comment-item-nested' : ''}`}
      id={`comment-${comment.id}`}
    >
      <div className="comment-item-body">
        <ClickableUser
          userId={comment.user?.id}
          name={comment.user?.name || 'Member'}
          avatarUrl={comment.user?.avatar_url || FALLBACK_AVATAR}
          size={isNested ? 'xs' : 'comment'}
          status={PRESENCE_STATUS.ONLINE}
          showStatus={!isNested}
          className={isNested ? 'comment-avatar-slot-sm' : 'comment-avatar-slot'}
        />

        <div className="comment-bubble">
          <div className="comment-meta">
            <ClickableUser
              userId={comment.user?.id}
              name={comment.user?.name || 'Member'}
              showName
              showAvatar={false}
              showStatus={false}
              nameClassName="comment-author !font-semibold"
              className="inline-flex !gap-0 !p-0 hover:!bg-transparent"
            />
            <span className="comment-time">{formatTimeAgo(comment.created_at)}</span>
            {edited && <span className="comment-edited">· {COPY.comments.edited}</span>}
          </div>

          {editing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <button type="button" className="comment-action" onClick={() => setEditing(false)}>
                  {COPY.comments.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={!editText.trim() || savingId === comment.id}
                  className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {savingId === comment.id ? COPY.comments.saving : COPY.comments.save}
                </button>
              </div>
            </div>
          ) : (
            <RichPostText text={comment.text} className="comment-text" />
          )}

          {!editing && (
            <div className="comment-actions-row">
              <button
                type="button"
                onClick={() => onLike?.(comment.id)}
                disabled={likingId === comment.id}
                className={`comment-action inline-flex items-center gap-1 ${comment.is_liked ? 'comment-action-active' : ''}`}
              >
                <Heart className={`h-3.5 w-3.5 ${comment.is_liked ? 'fill-current' : ''}`} />
                {(comment.likes_count ?? 0) > 0 ? comment.likes_count : COPY.comments.like}
              </button>
              {depth < maxNest && (
                <button
                  type="button"
                  onClick={() => setShowReply((v) => !v)}
                  className="comment-action"
                >
                  {COPY.comments.reply}
                </button>
              )}
              {(canEdit || canDelete) && (
                <div className="relative ml-auto" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((o) => !o)}
                    className="comment-action p-1"
                    aria-expanded={menuOpen}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  <AnimatePresence>
                    {menuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full z-30 mt-1 min-w-[140px] overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
                      >
                        {canEdit && (
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              setEditing(true);
                              setMenuOpen(false);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            {COPY.comments.edit}
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                            onClick={() => setConfirmDelete(true)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {COPY.comments.delete}
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          <AnimatePresence>
            {confirmDelete && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-destructive/5 px-3 py-2"
              >
                <span className="text-xs text-destructive">{COPY.comments.deleteConfirm}</span>
                <button
                  type="button"
                  className="comment-action"
                  onClick={() => setConfirmDelete(false)}
                >
                  {COPY.comments.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deletingId === comment.id}
                  className="rounded-full bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground disabled:opacity-50"
                >
                  {deletingId === comment.id ? '…' : COPY.comments.delete}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showReply && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CommentComposer
                  compact
                  autoFocus
                  value={replyText}
                  onChange={setReplyText}
                  onSubmit={handleReplySubmit}
                  submitting={submittingReply}
                  placeholder={COPY.comments.replyPlaceholder}
                  onCancel={() => setShowReply(false)}
                  submitLabel={COPY.comments.reply}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {replyCount > 0 && depth < maxNest && (
            <button
              type="button"
              onClick={() => setRepliesExpanded((v) => !v)}
              className="comment-reply-toggle"
            >
              {repliesExpanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  {COPY.comments.hideReplies}
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  {COPY.comments.showReplies(replyCount)}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {replies.length > 0 && repliesExpanded && depth < maxNest && (
        <div className="comment-replies-rail">
          {replies.map((child) => (
            <CommentItem
              key={child.id}
              comment={child}
              depth={depth + 1}
              postId={postId}
              postOwnerId={postOwnerId}
              currentUserId={currentUserId}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onLike={onLike}
              likingId={likingId}
              deletingId={deletingId}
              savingId={savingId}
            />
          ))}
        </div>
      )}
    </article>
  );
}
