// @ts-nocheck
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Heart,
  MessageCircle,
  Pin,
  Megaphone,
  Trash2,
  Pencil,
  Loader2,
  MoreHorizontal,
  Share2,
  Flag,
  Check,
  Bookmark,
  ChevronDown,
} from 'lucide-react';
import RichPostText from '@/components/RichPostText';
import AcademicIdentityLine from '@/components/user/AcademicIdentityLine';
import CodePostContent, { isCodePost } from '@/components/code/CodePostContent';
import PostMedia from '@/components/posts/PostMedia';
import CommentComposer from '@/components/comments/CommentComposer';
import { contentWithoutHashtags, mergeDisplayHashtags } from '@/utils/socialText';
import { buildMentionUserMap } from '@/utils/mentionUtils';
import communitiesService from '@/services/communitiesService';
import bookmarkService from '@/services/bookmarkService';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileNavigationOptional } from '@/contexts/ProfileNavigationContext';
import ConfirmActionDialog from '@/components/ui/ConfirmActionDialog';
import { CONFIRM_ACTION_PRESETS } from '@/components/ui/confirmActionPresets';
import {
  avatarOrFallback,
  formatTimeAgo,
  canModerateCommunity,
} from './communityUtils';
import { NOTIF_NAV_KEYS, consumeStringKey, peekStringKey } from '@/lib/notificationNavigation';

const commentId = (id) => (id == null ? '' : String(id));

function countDescendantReplies(replies) {
  if (!replies?.length) return 0;
  return replies.reduce((sum, r) => sum + 1 + countDescendantReplies(r.replies), 0);
}

function commentInTree(list, targetId) {
  const tid = commentId(targetId);
  if (!list?.length) return false;
  for (const c of list) {
    if (commentId(c.id) === tid) return true;
    if (commentInTree(c.replies, tid)) return true;
  }
  return false;
}

function findThreadRootId(roots, targetId) {
  const tid = commentId(targetId);
  for (const root of roots) {
    if (commentId(root.id) === tid) return root.id;
    if (commentInTree(root.replies, tid)) return root.id;
  }
  return null;
}

function CommentItem({
  comment,
  community,
  profileNav,
  currentUser,
  onReply,
  canReply,
  replyTarget,
  commentText,
  onCommentTextChange,
  onSubmitComment,
  onCancelReply,
  submittingComment,
  expandedThreads,
  onToggleThread,
  depth = 0,
}) {
  const isReplyingHere =
    replyTarget && commentId(replyTarget.id) === commentId(comment.id);
  const isNested = depth > 0;
  const replyCount = countDescendantReplies(comment.replies);
  const hasReplies = replyCount > 0;
  const isExpanded = expandedThreads.has(commentId(comment.id));

  return (
    <li
      id={`community-comment-${comment.id}`}
      className={[
        'comm-thread-item',
        isNested ? 'comm-thread-item--nested' : 'comm-thread-item--root',
        isReplyingHere ? 'comm-thread-item--replying' : '',
      ].join(' ')}
    >
      <div className="comm-thread-item__row">
        <button
          type="button"
          onClick={() => comment.user_id && profileNav?.openProfile?.(comment.user_id)}
          className="comm-thread-item__avatar-btn shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
        >
          <img
            src={avatarOrFallback(comment, undefined, currentUser)}
            alt=""
            className="comm-thread-item__avatar"
          />
        </button>

        <div className="comm-thread-item__content min-w-0 flex-1">
          <div className="comm-thread-item__header">
            <button
              type="button"
              onClick={() => comment.user_id && profileNav?.openProfile?.(comment.user_id)}
              className="comm-thread-item__author"
            >
              {comment.user_name || 'Member'}
            </button>
            <span className="comm-thread-item__dot" aria-hidden>
              ·
            </span>
            <span className="comm-thread-item__time">{formatTimeAgo(comment.created_at)}</span>
          </div>
          <AcademicIdentityLine
            user={comment}
            className="academic-identity-line--compact comm-post__identity-line"
          />

          <RichPostText
            text={comment.content}
            className="comm-thread-item__text"
            as="div"
            mentionUserMap={buildMentionUserMap(comment.mentions)}
          />

          <div className="comm-thread-item__actions">
            {canReply && !isReplyingHere ? (
              <button type="button" onClick={() => onReply(comment)} className="comm-thread-item__action">
                Reply
              </button>
            ) : null}
          </div>

          {isReplyingHere && canReply ? (
            <CommentComposer
              compact
              autoFocus
              value={commentText}
              onChange={onCommentTextChange}
              onSubmit={onSubmitComment}
              onCancel={onCancelReply}
              submitting={submittingComment}
              placeholder={`Reply to ${comment.user_name || 'Member'}…`}
            />
          ) : null}
        </div>
      </div>

      {hasReplies ? (
        <div className="comm-thread-replies">
          <div className="comm-thread-replies__rail" aria-hidden />
          <div className="comm-thread-replies__body">
            <button
              type="button"
              onClick={() => onToggleThread(comment.id)}
              className="comm-thread-replies__toggle"
              aria-expanded={isExpanded}
            >
              <ChevronDown
                className={['h-4 w-4 shrink-0 transition-transform duration-200', isExpanded ? 'rotate-0' : '-rotate-90'].join(' ')}
                aria-hidden
              />
              {isExpanded
                ? `Hide ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`
                : `Show ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`}
            </button>

            {isExpanded ? (
              <ul className="comm-thread-replies__list">
                {comment.replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    community={community}
                    profileNav={profileNav}
                    currentUser={currentUser}
                    onReply={onReply}
                    canReply={canReply}
                    replyTarget={replyTarget}
                    commentText={commentText}
                    onCommentTextChange={onCommentTextChange}
                    onSubmitComment={onSubmitComment}
                    onCancelReply={onCancelReply}
                    submittingComment={submittingComment}
                    expandedThreads={expandedThreads}
                    onToggleThread={onToggleThread}
                    depth={depth + 1}
                  />
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}

export default function CommunityPostCard({
  post,
  community,
  onLikeToggle,
  onDelete,
  onUpdate,
}) {
  const { user } = useAuth();
  const profileNav = useProfileNavigationOptional();
  const [showComments, setShowComments] = useState(false);
  const [highlightPost, setHighlightPost] = useState(false);
  const [focusCommentId, setFocusCommentId] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editTitle, setEditTitle] = useState(post.title || '');
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pinSaving, setPinSaving] = useState(false);
  const [announceSaving, setAnnounceSaving] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(!!post.is_bookmarked);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [expandedThreads, setExpandedThreads] = useState(() => new Set());
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const menuRef = useRef(null);

  const postMentionMap = buildMentionUserMap(post.mentions);
  const displayTags = mergeDisplayHashtags(post.tags, post.content);
  const codePost = isCodePost(post);
  const displayContent = codePost ? '' : contentWithoutHashtags(post.content);

  const isAuthor = user && String(post.user_id) === String(user.id);
  const canMod = canModerateCommunity(community);
  const canEdit = isAuthor || canMod;
  const canDelete = isAuthor || canMod;

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  useEffect(() => {
    setIsBookmarked(!!post.is_bookmarked);
  }, [post.id, post.is_bookmarked]);

  useEffect(() => {
    const targetPostId = peekStringKey(NOTIF_NAV_KEYS.COMMUNITY_POST_ID);
    if (!targetPostId || String(targetPostId) !== String(post.id)) return;

    consumeStringKey(NOTIF_NAV_KEYS.COMMUNITY_POST_ID);
    setHighlightPost(true);
    window.setTimeout(() => setHighlightPost(false), 3200);

    if (consumeStringKey(NOTIF_NAV_KEYS.OPEN_COMMENTS)) {
      setShowComments(true);
    }

    const commentId =
      consumeStringKey(NOTIF_NAV_KEYS.COMMUNITY_COMMENT_ID) ||
      consumeStringKey(NOTIF_NAV_KEYS.HIGHLIGHT_COMMENT);
    if (commentId) setFocusCommentId(commentId);

    window.requestAnimationFrame(() => {
      document.getElementById(`community-post-${post.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [post.id]);

  useEffect(() => {
    if (!focusCommentId || commentsLoading || comments.length === 0) return undefined;
    const timer = window.setTimeout(() => {
      const el = document.getElementById(`community-comment-${focusCommentId}`);
      if (!el) return;
      el.classList.add('comment-item--notif-target');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => el.classList.remove('comment-item--notif-target'), 3200);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [focusCommentId, commentsLoading, comments]);

  const openAuthorProfile = () => {
    if (post.user_id) profileNav?.openProfile?.(post.user_id);
  };

  const loadComments = useCallback(async () => {
    setCommentsLoading(true);
    try {
      const res = await communitiesService.getPostComments(post.community_id, post.id, {
        limit: 50,
        page: 1,
      });
      const list = res.comments || [];
      setComments(list);
      return list;
    } catch {
      setComments([]);
      return [];
    } finally {
      setCommentsLoading(false);
    }
  }, [post.community_id, post.id]);

  const toggleComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) await loadComments();
  };

  const toggleThread = (id) => {
    const key = commentId(id);
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandThreadChain = (targetCommentId, list = comments) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      const walk = (nodes) => {
        if (!nodes?.length) return false;
        for (const c of nodes) {
          if (commentId(c.id) === commentId(targetCommentId)) {
            next.add(commentId(c.id));
            return true;
          }
          if (c.replies?.length && walk(c.replies)) {
            next.add(commentId(c.id));
            return true;
          }
        }
        return false;
      };
      walk(list);
      const rootId = findThreadRootId(list, targetCommentId);
      if (rootId) next.add(commentId(rootId));
      return next;
    });
  };

  const startReply = (comment) => {
    setReplyTarget({ id: comment.id, user_name: comment.user_name || 'Member' });
    setShowComments(true);
    setCommentText('');
    expandThreadChain(comment.id);
  };

  const cancelReply = () => {
    setReplyTarget(null);
    setCommentText('');
  };

  const submitComment = async (composerPayload) => {
    const content = (composerPayload?.content ?? commentText).trim();
    if (!content || !community?.is_member) return;
    setSubmittingComment(true);
    const parentId = replyTarget?.id || null;
    try {
      const payload = {
        content,
        mentioned_users: composerPayload?.mentioned_users || [],
      };
      if (parentId) payload.parent_id = parentId;
      await communitiesService.createPostComment(post.community_id, post.id, payload);
      setCommentText('');
      setReplyTarget(null);
      const list = await loadComments();
      if (parentId) {
        expandThreadChain(parentId, list);
      }
      onUpdate?.({ ...post, comments_count: (post.comments_count || 0) + 1 });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleBookmark = async () => {
    if (bookmarkBusy) return;
    setBookmarkBusy(true);
    try {
      if (isBookmarked) {
        const check = await bookmarkService.checkBookmark('community_post', post.id);
        if (check.bookmark_id) await bookmarkService.deleteBookmark(check.bookmark_id);
        setIsBookmarked(false);
        onUpdate?.({ ...post, is_bookmarked: false });
      } else {
        await bookmarkService.createBookmark('community_post', post.id);
        setIsBookmarked(true);
        onUpdate?.({ ...post, is_bookmarked: true });
      }
    } catch {
      /* ignore */
    } finally {
      setBookmarkBusy(false);
    }
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const { post: updated } = await communitiesService.updateCommunityPost(
        post.community_id,
        post.id,
        { title: editTitle, content: editContent },
      );
      onUpdate?.(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmedDelete = async () => {
    await communitiesService.deleteCommunityPost(post.community_id, post.id);
    onDelete?.(post.id);
    setConfirmDelete(false);
  };

  const handleTogglePin = async () => {
    setPinSaving(true);
    setMenuOpen(false);
    try {
      const res = await communitiesService.togglePostPin(post.community_id, post.id);
      onUpdate?.({ ...post, is_pinned: res?.is_pinned ?? !post.is_pinned });
    } finally {
      setPinSaving(false);
    }
  };

  const handleToggleAnnouncement = async () => {
    setAnnounceSaving(true);
    setMenuOpen(false);
    try {
      const res = await communitiesService.togglePostAnnouncement(post.community_id, post.id);
      onUpdate?.({ ...post, is_announcement: res?.is_announcement ?? !post.is_announcement });
    } finally {
      setAnnounceSaving(false);
    }
  };

  const copyPostLink = async () => {
    try {
      const url = `${window.location.origin}/communities/${post.community_id}/posts/${post.id}`;
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const handleShare = async () => {
    setMenuOpen(false);
    await copyPostLink();
  };

  const handleReport = () => {
    setMenuOpen(false);
    setReportReason('');
    setReportOpen(true);
  };

  const submitReport = async () => {
    const reason = reportReason.trim();
    if (!reason) return;
    setReportSubmitting(true);
    try {
      await communitiesService.reportPost(post.community_id, post.id, reason);
      setReportOpen(false);
      setReportReason('');
    } catch {
      /* ignore */
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleLikeClick = () => {
    if (!community?.is_member) return;
    onLikeToggle?.(post);
  };

  const cardClass = [
    'comm-post feed-post animate-in fade-in duration-200',
    post.is_pinned ? 'comm-post--pinned' : '',
    post.is_announcement ? 'comm-post--announcement' : '',
  ].join(' ');

  return (
    <>
      <article id={`community-post-${post.id}`} className={[cardClass, highlightPost ? 'feed-post--notif-target' : ''].filter(Boolean).join(' ')}>
        <div className="comm-post__inner">
          {(post.is_pinned || post.is_announcement) && !editing ? (
            <div className="comm-post__badges">
              {post.is_pinned ? (
                <span className="comm-post__badge comm-post__badge--pin">
                  <Pin className="h-2.5 w-2.5" aria-hidden />
                  Pinned
                </span>
              ) : null}
              {post.is_announcement ? (
                <span className="comm-post__badge comm-post__badge--announce">
                  <Megaphone className="h-2.5 w-2.5" aria-hidden />
                  Announcement
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="comm-post__header">
            <button
              type="button"
              onClick={openAuthorProfile}
              className="comm-post__avatar-btn"
              aria-label={`View ${post.user_name || 'user'} profile`}
            >
              <img
                src={avatarOrFallback(post, undefined, user)}
                alt=""
                className="comm-post__avatar"
              />
            </button>

            <div className="comm-post__author">
              <div className="comm-post__author-row">
                <button
                  type="button"
                  onClick={openAuthorProfile}
                  className="comm-post__author-name"
                >
                  {post.user_name || 'Member'}
                </button>
              </div>
              <AcademicIdentityLine
                user={post}
                className="academic-identity-line--compact comm-post__identity-line"
              />
              <p className="comm-post__meta">
                {formatTimeAgo(post.created_at)}
                {post.updated_at && post.updated_at !== post.created_at ? ' · Edited' : ''}
              </p>
            </div>

            {!editing && (
              <div className="comm-post__menu" ref={menuOpen ? menuRef : null}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Post actions"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className="comm-post__menu-trigger"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {menuOpen && (
                  <div className="vh-action-menu vh-action-menu--align-right animate-in fade-in zoom-in-95 duration-100" style={{ top: 'calc(100% + 0.25rem)' }}>
                    <button type="button" onClick={handleShare} className="vh-action-menu__item">
                      {shareCopied ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Share2 className="h-4 w-4 text-muted-foreground" />
                      )}
                      {shareCopied ? 'Link copied' : 'Copy link'}
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(true);
                          setMenuOpen(false);
                        }}
                        className="vh-action-menu__item"
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                        Edit post
                      </button>
                    )}
                    {canMod && (
                      <>
                        <button
                          type="button"
                          onClick={handleTogglePin}
                          disabled={pinSaving}
                          className="vh-action-menu__item disabled:opacity-50"
                        >
                          {pinSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Pin className="h-4 w-4 text-muted-foreground" />
                          )}
                          {post.is_pinned ? 'Unpin' : 'Pin to top'}
                        </button>
                        <button
                          type="button"
                          onClick={handleToggleAnnouncement}
                          disabled={announceSaving}
                          className="vh-action-menu__item disabled:opacity-50"
                        >
                          {announceSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Megaphone className="h-4 w-4 text-muted-foreground" />
                          )}
                          {post.is_announcement ? 'Remove announcement' : 'Mark as announcement'}
                        </button>
                      </>
                    )}
                    {!isAuthor && (
                      <button type="button" onClick={handleReport} className="vh-action-menu__item">
                        <Flag className="h-4 w-4 text-muted-foreground" />
                        Report
                      </button>
                    )}
                    {canDelete && (
                      <>
                        <div className="vh-action-menu__divider" />
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDelete(true);
                            setMenuOpen(false);
                          }}
                          className="vh-action-menu__item vh-action-menu__item--danger"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete post
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {editing ? (
            <div className="comm-post__body comm-post__edit">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Title (optional)"
                className="comm-post__edit-input font-semibold"
              />
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={4}
                className="comm-post__edit-input"
              />
              <div className="comm-post__edit-actions">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setEditContent(post.content);
                    setEditTitle(post.title || '');
                  }}
                  className="comm-detail-header__btn comm-detail-header__btn--secondary h-9"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving || !editContent.trim()}
                  onClick={handleSaveEdit}
                  className="comm-detail-header__btn comm-detail-header__btn--join h-9"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div className="comm-post__body">
              {post.title ? <h3 className="comm-post__title">{post.title}</h3> : null}
              {codePost ? (
                <CodePostContent
                  post={post}
                  descriptionClassName="feed-post__content comm-post__content"
                  mentionUserMap={postMentionMap}
                  tagsSlot={
                    displayTags.length > 0 ? (
                      <div className="feed-post__tags">
                        {displayTags.map((tag) => (
                          <span key={tag} className="feed-post__tag">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : null
                  }
                />
              ) : displayContent ? (
                <RichPostText
                  text={displayContent}
                  className="feed-post__content comm-post__content"
                  as="div"
                  mentionUserMap={postMentionMap}
                />
              ) : null}
              {!codePost && displayTags.length > 0 ? (
                <div className="feed-post__tags">
                  {displayTags.map((tag) => (
                    <span key={tag} className="feed-post__tag">
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : null}
              {post.image_url ? (
                <PostMedia mediaUrls={[post.image_url]} className="comm-post__media" />
              ) : null}
            </div>
          )}

          {!editing && (
            <>
              <div className="feed-post__stats">
                <div className="feed-post__stats-left">
                  {(post.likes_count ?? 0) > 0 ? (
                    <button type="button" onClick={handleLikeClick} disabled={!community?.is_member} className="feed-post__stats-btn">
                      <span className="feed-post__like-pill" aria-hidden>
                        <Heart className="fill-current" />
                      </span>
                      <span>{post.likes_count}</span>
                    </button>
                  ) : (
                    <span className="text-muted-foreground/70">Be the first to like</span>
                  )}
                </div>
                <div className="feed-post__stats-right">
                  {(post.comments_count ?? 0) > 0 ? (
                    <button type="button" onClick={toggleComments} className="feed-post__stats-btn">
                      {post.comments_count} comment{post.comments_count === 1 ? '' : 's'}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="feed-post__actions">
                <button
                  type="button"
                  onClick={handleLikeClick}
                  disabled={!community?.is_member}
                  aria-pressed={post.is_liked}
                  className={[
                    'feed-post__action',
                    post.is_liked ? 'feed-post__action--like-active' : '',
                  ].join(' ')}
                >
                  <Heart className={post.is_liked ? 'fill-current' : ''} />
                  <span>Like</span>
                </button>

                <button
                  type="button"
                  onClick={toggleComments}
                  aria-expanded={showComments}
                  className={[
                    'feed-post__action',
                    showComments ? 'feed-post__action--comment-active' : '',
                  ].join(' ')}
                >
                  <MessageCircle className={showComments ? 'fill-current' : ''} />
                  <span>Comment</span>
                </button>

                <button
                  type="button"
                  disabled={bookmarkBusy}
                  onClick={handleBookmark}
                  aria-pressed={isBookmarked}
                  aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
                  className={[
                    'feed-post__action',
                    isBookmarked ? 'feed-post__action--comment-active' : '',
                  ].join(' ')}
                >
                  <Bookmark className={isBookmarked ? 'fill-current' : ''} />
                  <span>{isBookmarked ? 'Saved' : 'Save'}</span>
                </button>

                <button type="button" onClick={copyPostLink} className="feed-post__action">
                  {shareCopied ? (
                    <Check className="h-[1.0625rem] w-[1.0625rem]" />
                  ) : (
                    <Share2 />
                  )}
                  <span>{shareCopied ? 'Copied' : 'Share'}</span>
                </button>
              </div>
            </>
          )}

          {showComments && (
            <div className="comm-post__comments animate-in fade-in slide-in-from-top-1 duration-150">
              {commentsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : comments.length === 0 ? (
                <p className="comm-post__comments-empty">No comments yet. Be the first.</p>
              ) : (
                <ul className="comm-thread-list">
                  {comments.map((c) => (
                    <CommentItem
                      key={c.id}
                      comment={c}
                      community={community}
                      profileNav={profileNav}
                      currentUser={user}
                      onReply={startReply}
                      canReply={!!community?.is_member}
                      replyTarget={replyTarget}
                      commentText={commentText}
                      onCommentTextChange={setCommentText}
                      onSubmitComment={submitComment}
                      onCancelReply={cancelReply}
                      submittingComment={submittingComment}
                      expandedThreads={expandedThreads}
                      onToggleThread={toggleThread}
                      depth={0}
                    />
                  ))}
                </ul>
              )}

              {community?.is_member && !replyTarget ? (
                <div className="comm-thread-compose comm-thread-compose--social">
                  <CommentComposer
                    value={commentText}
                    onChange={setCommentText}
                    onSubmit={submitComment}
                    submitting={submittingComment}
                    placeholder="Add a comment… Use @ to mention, # for topics"
                  />
                </div>
              ) : community?.is_member ? null : (
                <p className="comm-post__comment-guest">Join this community to comment.</p>
              )}
            </div>
          )}
        </div>
      </article>

      <ConfirmActionDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        {...CONFIRM_ACTION_PRESETS.deletePost}
        onConfirm={handleConfirmedDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <ConfirmActionDialog
        open={reportOpen}
        onOpenChange={(open) => {
          if (!open && !reportSubmitting) {
            setReportOpen(false);
            setReportReason('');
          }
        }}
        title={CONFIRM_ACTION_PRESETS.reportPost.title}
        description="Tell us what's wrong with this post. Reports are reviewed by community moderators."
        confirmLabel={CONFIRM_ACTION_PRESETS.reportPost.confirmLabel}
        tone={CONFIRM_ACTION_PRESETS.reportPost.tone}
        icon={CONFIRM_ACTION_PRESETS.reportPost.icon}
        loading={reportSubmitting}
        loadingLabel="Submitting…"
        confirmDisabled={!reportReason.trim()}
        onConfirm={() => void submitReport()}
        onCancel={() => {
          setReportOpen(false);
          setReportReason('');
        }}
        contextSlot={(
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="e.g. spam, harassment, off-topic…"
            rows={3}
            disabled={reportSubmitting}
            autoFocus
            className="confirm-action-dialog__context confirm-action-dialog__context--preview mt-0 w-full resize-none border border-border/60 bg-card px-3.5 py-2.5 text-left text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        )}
      />
    </>
  );
}
