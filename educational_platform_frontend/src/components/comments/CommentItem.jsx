import { useState, useRef, useEffect } from 'react';
import {
  BadgeCheck,
  Heart,
  MoreHorizontal,
  Pencil,
  Reply,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import RichPostText from '@/components/RichPostText';
import CommentComposer from '@/components/comments/CommentComposer';
import { COPY } from '@/lib/copy';
import ClickableUser from '@/components/ui/ClickableUser';
import { PRESENCE_STATUS } from '@/lib/presence';
import { useAuth } from '@/contexts/AuthContext';
import {
  buildCommentMetaParts,
  formatCommentRoleBadge,
  isVerifiedCommentAuthor,
} from '@/lib/commentAuthorMeta';
import AcademicIdentityLine from '@/components/user/AcademicIdentityLine';
import { cn } from '@/lib/utils';

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

function roleBadgeClass(role) {
  if (role === 'FACULTY') return 'comment-role-badge comment-role-badge--faculty';
  if (role === 'ALUMNI') return 'comment-role-badge comment-role-badge--alumni';
  return 'comment-role-badge';
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
  const { user: currentUser } = useAuth();
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

  const roleBadge = formatCommentRoleBadge(comment.user?.user_type || comment.user?.role);
  const metaParts = buildCommentMetaParts();
  const timeLabel = formatTimeAgo(comment.created_at);
  const showRepliesToggle = replyCount > 0 && depth < maxNest;
  const hasMenu = canEdit || canDelete;

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

  const likesCount = comment.likes_count ?? 0;

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
          size="comment"
          status={PRESENCE_STATUS.ONLINE}
          showStatus
          className="comment-avatar-slot"
        />

        <div className="comment-bubble">
          <div className="comment-bubble__top">
            <div className="comment-bubble__identity">
              <div className="comment-header-row">
                <ClickableUser
                  userId={comment.user?.id}
                  name={comment.user?.name || 'Member'}
                  showName
                  showAvatar={false}
                  showStatus={false}
                  nameClassName="comment-author"
                  className="inline-flex !gap-0 !p-0 hover:!bg-transparent"
                />
                {isVerifiedCommentAuthor(comment.user) ? (
                  <span className="comment-verified" aria-label="Verified">
                    <BadgeCheck strokeWidth={3} />
                  </span>
                ) : null}
                {roleBadge ? <span className={roleBadgeClass(roleBadge)}>{roleBadge}</span> : null}
              </div>

              <AcademicIdentityLine
                user={comment.user}
                className="academic-identity-line--compact comment-identity-line"
              />

              <p className="comment-meta-line">
                {metaParts.map((part, idx) => (
                  <span key={`meta-${idx}`}>
                    {idx > 0 ? <span className="comment-meta-sep" aria-hidden> · </span> : null}
                    {part}
                  </span>
                ))}
                {metaParts.length > 0 ? (
                  <span className="comment-meta-sep" aria-hidden> · </span>
                ) : null}
                <span>{timeLabel}</span>
                {edited ? (
                  <>
                    <span className="comment-meta-sep" aria-hidden> · </span>
                    <span className="comment-edited">{COPY.comments.edited}</span>
                  </>
                ) : null}
              </p>
            </div>

            {hasMenu ? (
              <div className="comment-bubble__menu" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="comment-menu-btn"
                  aria-expanded={menuOpen}
                  aria-label="Comment options"
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
                      className="vh-action-menu vh-action-menu--align-right"
                      style={{ top: 'calc(100% + 0.25rem)' }}
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
                          className="vh-action-menu__item vh-action-menu__item--danger"
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
            ) : null}
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
                  className={cn(
                    'comment-composer-card__post',
                    editText.trim() || savingId === comment.id
                      ? 'comment-composer-card__post--ready'
                      : 'comment-composer-card__post--disabled',
                    savingId === comment.id && 'comment-composer-card__post--loading',
                  )}
                  aria-busy={savingId === comment.id}
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
                className={`comment-action ${comment.is_liked ? 'comment-action--liked' : ''}`}
                aria-pressed={Boolean(comment.is_liked)}
              >
                <Heart className={comment.is_liked ? 'fill-current' : ''} />
                {likesCount > 0 ? likesCount : COPY.comments.like}
              </button>

              {depth < maxNest && (
                <button
                  type="button"
                  onClick={() => setShowReply((v) => !v)}
                  className="comment-action"
                  aria-expanded={showReply}
                >
                  <Reply aria-hidden />
                  {COPY.comments.reply}
                </button>
              )}

              {showRepliesToggle && (
                <button
                  type="button"
                  onClick={() => setRepliesExpanded((v) => !v)}
                  className="comment-replies-toggle"
                  aria-expanded={repliesExpanded}
                >
                  {repliesExpanded
                    ? COPY.comments.hideReplies(replyCount)
                    : COPY.comments.showReplies(replyCount)}
                </button>
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
