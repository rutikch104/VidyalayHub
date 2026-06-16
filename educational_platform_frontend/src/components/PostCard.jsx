import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle, Repeat2, Heart, MoreHorizontal, Share2, Bookmark, BadgeCheck,
  Image, Video, Code2, FileText, Pencil, Trash2, X, Megaphone, Check,
  Building2, HelpCircle, Lock,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import postService from '@/services/postService';
import ClickableUser from '@/components/ui/ClickableUser';
import { PRESENCE_STATUS } from '@/lib/presence';
import AcademicIdentityLine from '@/components/user/AcademicIdentityLine';
import bookmarkService from '@/services/bookmarkService';
import { emitNotificationsChanged } from '@/services/notificationService';
import RichPostText from '@/components/RichPostText';
import CommentSection from '@/components/comments/CommentSection';
import CodePostContent, { isCodePost } from '@/components/code/CodePostContent';
import PostMedia from '@/components/posts/PostMedia';
import PostEngagementModal from '@/components/posts/PostEngagementModal';
import AmplifyModal from '@/components/posts/AmplifyModal';
import RemoveAmplifyDialog from '@/components/posts/RemoveAmplifyDialog';
import ConfirmActionDialog from '@/components/ui/ConfirmActionDialog';
import { CONFIRM_ACTION_PRESETS } from '@/components/ui/confirmActionPresets';
import { contentWithoutHashtags, mergeDisplayHashtags } from '@/utils/socialText';
import { NOTIF_NAV_KEYS, consumeStringKey, peekStringKey } from '@/lib/notificationNavigation';

const FALLBACK_AVATAR =
  'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150';

/* ─── helpers ───────────────────────────────────────────────────── */
function formatTimeAgo(dateString) {
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 60)       return 'just now';
  if (diff < 3600)     return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)    return `${Math.floor(diff / 3600)}h`;
  if (diff < 2592000)  return `${Math.floor(diff / 86400)}d`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo`;
  return `${Math.floor(diff / 31536000)}y`;
}

function formatNumber(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatRoleLabel(raw) {
  if (!raw) return '';
  return String(raw).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function isVerifiedAuthor(u) {
  const t = String(u?.user_type || u?.role || u?.title || '').toLowerCase();
  return ['teacher', 'faculty', 'admin', 'professor', 'institution', 'super'].some(k => t.includes(k));
}

function visibilityScope(post) {
  if (post.visibility === 'college_only') return { label: 'College', Icon: Building2 };
  if (post.visibility === 'private') return { label: 'Private', Icon: Lock };
  return null;
}

/* ─── PostCard ──────────────────────────────────────────────────── */
const PostCard = ({ post, embedded = false, onPostDeleted, onPostEdited, onNavigate, onAmplified }) => {
  const { user } = useAuth();
  const [isLiked,           setIsLiked]           = useState(post.is_liked);
  const [isBookmarked,      setIsBookmarked]       = useState(post.is_bookmarked);
  const [showComments,      setShowComments]       = useState(false);
  const [likesCount,        setLikesCount]         = useState(post.likes_count);
  const [commentsCount,     setCommentsCount]      = useState(post.comments_count);
  const [repostsCount,      setRepostsCount]       = useState(post.reposts_count ?? 0);
  const [isReposted,        setIsReposted]         = useState(post.is_reposted ?? false);
  const [engagementModal,   setEngagementModal]    = useState(null);
  const [amplifyOpen,       setAmplifyOpen]        = useState(false);
  const [removeAmplifyOpen, setRemoveAmplifyOpen]   = useState(false);
  const [amplifyRemoving,   setAmplifyRemoving]     = useState(false);
  const [loading,           setLoading]            = useState(false);
  const [shareFeedback,     setShareFeedback]      = useState('');
  const [menuOpen,          setMenuOpen]           = useState(false);
  const [editOpen,          setEditOpen]           = useState(false);
  const [editContent,       setEditContent]        = useState(post.content);
  const [editVisibility,    setEditVisibility]     = useState(post.visibility);
  const [editSaving,        setEditSaving]         = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen]  = useState(false);
  const [deletingPost,      setDeletingPost]       = useState(false);
  const [highlightPost,     setHighlightPost]      = useState(false);
  const [focusCommentId,    setFocusCommentId]     = useState(null);
  const menuRef = useRef(null);

  const isOwner = user?.id && post.user?.id && String(user.id) === String(post.user.id);

  useEffect(() => {
    setIsLiked(post.is_liked);
    setLikesCount(post.likes_count);
    setCommentsCount(post.comments_count);
    setRepostsCount(post.reposts_count ?? 0);
    setIsReposted(post.is_reposted ?? false);
    setIsBookmarked(post.is_bookmarked);
  }, [post.id, post.is_liked, post.likes_count, post.comments_count, post.reposts_count, post.is_reposted, post.is_bookmarked]);

  useEffect(() => {
    const targetPostId = peekStringKey(NOTIF_NAV_KEYS.POST_ID) || peekStringKey('scroll_to_post_id');
    if (!targetPostId || String(targetPostId) !== String(post.id)) return;

    consumeStringKey(NOTIF_NAV_KEYS.POST_ID);
    consumeStringKey('scroll_to_post_id');

    if (consumeStringKey(NOTIF_NAV_KEYS.HIGHLIGHT_POST)) {
      setHighlightPost(true);
      window.setTimeout(() => setHighlightPost(false), 3200);
    }

    if (consumeStringKey(NOTIF_NAV_KEYS.OPEN_COMMENTS)) {
      setShowComments(true);
    }

    const commentId =
      consumeStringKey(NOTIF_NAV_KEYS.COMMENT_ID) ||
      consumeStringKey(NOTIF_NAV_KEYS.HIGHLIGHT_COMMENT);
    if (commentId) setFocusCommentId(commentId);
  }, [post.id]);

  useEffect(() => {
    if (!editOpen) return;
    setEditContent(post.content);
    setEditVisibility(post.visibility);
  }, [editOpen, post.id, post.content, post.visibility]);

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  /* ── share / repost ── */
  const postShareUrl = `${window.location.origin}/?post=${post.id}`;
  const flashFeedback = (msg) => { setShareFeedback(msg); setTimeout(() => setShareFeedback(''), 2800); };

  const handleShare = async () => {
    const title = `Post by ${post.user.name}`;
    const text  = (post.content || '').trim().slice(0, 200) || 'Check out this post';
    try {
      if (navigator.share) { await navigator.share({ title, text, url: postShareUrl }); flashFeedback('Shared'); }
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(postShareUrl); flashFeedback('Link copied'); }
      else flashFeedback('Copy not supported');
    } catch (e) {
      if (e?.name === 'AbortError') return;
      try { await navigator.clipboard.writeText(postShareUrl); flashFeedback('Link copied'); }
      catch { flashFeedback('Could not share'); }
    }
  };

  const handleAmplifyClick = () => {
    if (isReposted) {
      setRemoveAmplifyOpen(true);
      return;
    }
    setAmplifyOpen(true);
  };

  const handleConfirmRemoveAmplify = async () => {
    if (amplifyRemoving) return;
    setAmplifyRemoving(true);
    try {
      const res = await postService.removeAmplify(post.id);
      handleAmplified(res);
      setRemoveAmplifyOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setAmplifyRemoving(false);
    }
  };

  const handleAmplified = (res) => {
    setIsReposted(res?.is_amplified ?? res?.is_reposted ?? false);
    setRepostsCount(res?.amplifies_count ?? res?.reposts_count ?? repostsCount);
    onAmplified?.(res);
  };

  const openEngagementModal = (type) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setEngagementModal(type);
  };

  /* ── like / bookmark ── */
  const handleLike = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await postService.toggleLike(post.id);
      setIsLiked(res.is_liked);
      setLikesCount(res.likes_count);
      emitNotificationsChanged();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleBookmark = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (isBookmarked) {
        const check = await bookmarkService.checkBookmark('post', post.id);
        if (check.bookmark_id) await bookmarkService.deleteBookmark(check.bookmark_id);
        setIsBookmarked(false);
      } else {
        await bookmarkService.createBookmark('post', post.id);
        setIsBookmarked(true);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  /* ── edit / delete ── */
  const handleSaveEdit = async () => {
    const trimmed = editContent.trim();
    if (!trimmed && (!post.media_urls || post.media_urls.length === 0)) return;
    setEditSaving(true);
    try {
      const updated = await postService.updatePost(post.id, {
        content: trimmed || ' ',
        visibility: editVisibility,
        type: post.type,
      });
      onPostEdited?.(updated);
      setEditOpen(false);
      setMenuOpen(false);
    } catch (err) { console.error(err); }
    finally { setEditSaving(false); }
  };

  const handleDeletePost = async () => {
    setDeletingPost(true);
    try {
      await postService.deletePost(post.id);
      onPostDeleted?.(post.id);
      setDeleteConfirmOpen(false);
      setMenuOpen(false);
    } catch (err) { console.error(err); }
    finally { setDeletingPost(false); }
  };

  const toggleComments = () => setShowComments((v) => !v);

  /* ── post type icon / label ── */
  const POST_TYPE_META = {
    image:    { icon: Image,         shortLabel: 'Image',        label: 'Image', color: 'text-sky-500' },
    video:    { icon: Video,         shortLabel: 'Video',        label: 'Video', color: 'text-emerald-500' },
    code:     { icon: Code2,         shortLabel: 'Code',         label: `Code${post.code_language ? ` · ${post.code_language}` : ''}`, color: 'text-violet-500' },
    question: { icon: HelpCircle,    shortLabel: 'Question',     label: 'Question', color: 'text-rose-500' },
    update:   { icon: Megaphone,     shortLabel: 'Announcement', label: 'Update', color: 'text-indigo-500' },
  };
  const codePost = isCodePost(post);
  const typeMeta = POST_TYPE_META[post.type] ?? (codePost ? POST_TYPE_META.code : {
    icon: FileText, shortLabel: 'Post', label: 'Post', color: 'text-muted-foreground',
  });
  const TypeIcon = typeMeta.icon;

  const scope = visibilityScope(post);
  const ScopeIcon = scope?.Icon;
  const typeLabel = typeMeta?.shortLabel || typeMeta?.label;
  const showTypeLabel = typeLabel && typeLabel !== 'Post';
  const timeLabel = formatTimeAgo(post.created_at);
  const displayTags = mergeDisplayHashtags(post.hashtags, post.content);
  const bodyText = displayTags.length > 0 ? contentWithoutHashtags(post.content) : (post.content || '');
  const displayContent = codePost ? '' : bodyText.trim();

  return (
    <article
      id={`post-${post.id}`}
      className={[
        'social-feed-card feed-post group',
        embedded ? 'feed-post--embedded' : '',
        highlightPost ? 'feed-post--notif-target' : '',
      ].filter(Boolean).join(' ')}
    >
      {shareFeedback ? (
        <div className="feed-post__toast" role="status">{shareFeedback}</div>
      ) : null}

      <header className="feed-post__header">
        <div className="feed-post__author-block">
          <ClickableUser
            userId={post.user?.id}
            name={post.user?.name}
            avatarUrl={post.user?.avatar_url || FALLBACK_AVATAR}
            size="md"
            showStatus={!embedded}
            status={PRESENCE_STATUS.ONLINE}
            className="shrink-0"
          />
          <div className={[
            'feed-post__author-meta',
            embedded ? 'feed-post__author-meta--stacked' : '',
          ].filter(Boolean).join(' ')}>
            <div className="feed-post__name-row">
              <ClickableUser
                userId={post.user?.id}
                name={post.user?.name}
                showName
                showAvatar={false}
                showStatus={false}
                nameClassName="feed-post__author-name"
                className="inline-flex !gap-0 !p-0 hover:!bg-transparent"
              />
              {!embedded ? (
                <>
                  <span className="feed-post__meta-sep feed-post__meta-sep--inline" aria-hidden>·</span>
                  <time className="feed-post__time" dateTime={post.created_at}>
                    {timeLabel}
                  </time>
                </>
              ) : null}
              {showTypeLabel && !embedded ? (
                <>
                  <span className="feed-post__meta-sep feed-post__meta-sep--inline" aria-hidden>·</span>
                  <span className="feed-post__meta-type">
                    <TypeIcon className={`h-3 w-3 ${typeMeta.color}`} aria-hidden />
                    {typeLabel}
                  </span>
                </>
              ) : null}
              {isVerifiedAuthor(post.user) ? (
                <span className="feed-post__verified" aria-label="Verified">
                  <BadgeCheck strokeWidth={3} />
                </span>
              ) : null}
              {scope && ScopeIcon && !embedded ? (
                <span className="feed-post__scope-badge">
                  <ScopeIcon aria-hidden />
                  {scope.label}
                </span>
              ) : null}
            </div>
            <AcademicIdentityLine
              user={post.user}
              className="academic-identity-line--feed feed-post__identity-line"
              showProfessional={embedded}
            />
            {embedded ? (
              <time className="feed-post__timestamp-stacked" dateTime={post.created_at}>
                {timeLabel}
              </time>
            ) : null}
          </div>
        </div>

        {!embedded ? (
        <div className="feed-post__header-actions">
          <button
            type="button"
            onClick={handleBookmark}
            disabled={loading}
            className={[
              'feed-post__icon-btn',
              isBookmarked ? 'feed-post__icon-btn--saved' : '',
              loading ? 'cursor-not-allowed opacity-50' : '',
            ].join(' ')}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
          >
            <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>

          <div className="feed-post__menu-wrap" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              className="feed-post__icon-btn"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              aria-label="Post options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {menuOpen ? (
              <div className="vh-action-menu vh-action-menu--align-right animate-fade-scale" style={{ top: 'calc(100% + 0.375rem)' }}>
                {isOwner ? (
                  <>
                    <button
                      type="button"
                      className="vh-action-menu__item"
                      onClick={() => { setEditOpen(true); setMenuOpen(false); }}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                      Edit post
                    </button>
                    <button
                      type="button"
                      className="vh-action-menu__item vh-action-menu__item--danger"
                      onClick={() => { setDeleteConfirmOpen(true); setMenuOpen(false); }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete post
                    </button>
                  </>
                ) : (
                  <span className="vh-action-menu__item text-muted-foreground">Post options</span>
                )}
              </div>
            ) : null}
          </div>
        </div>
        ) : null}
      </header>

      {displayContent || codePost ? (
        <div className="feed-post__body">
          {codePost ? (
            <CodePostContent
              post={post}
              tagsSlot={
                displayTags.length > 0 ? (
                  <div className="feed-post__tags">
                    {displayTags.map(tag => (
                      <span key={tag} className="feed-post__tag">#{tag}</span>
                    ))}
                  </div>
                ) : null
              }
            />
          ) : (
            <RichPostText text={displayContent} className="feed-post__content" />
          )}
        </div>
      ) : null}

      {displayTags.length > 0 && !codePost ? (
        <div className="feed-post__tags">
          {displayTags.map(tag => (
            <span key={tag} className="feed-post__tag">#{tag}</span>
          ))}
        </div>
      ) : null}

      {post.media_urls && post.media_urls.length > 0 ? (
        <PostMedia mediaUrls={post.media_urls} />
      ) : null}

      <div className="feed-post__stats">
        <div className="feed-post__stats-left">
          {likesCount > 0 ? (
            <button
              type="button"
              onClick={openEngagementModal('likes')}
              className="feed-post__stats-btn"
              aria-label={`View ${likesCount} likes`}
            >
              <span className="feed-post__like-pill" aria-hidden>
                <Heart className="fill-current" />
              </span>
              <span>
                {formatNumber(likesCount)} {likesCount === 1 ? 'like' : 'likes'}
              </span>
            </button>
          ) : (
            <span className="feed-post__stats-muted">Be the first to like</span>
          )}
        </div>
        <div className="feed-post__stats-right">
          {commentsCount > 0 ? (
            <button type="button" onClick={toggleComments} className="feed-post__stats-btn">
              {formatNumber(commentsCount)} comment{commentsCount === 1 ? '' : 's'}
            </button>
          ) : null}
          {commentsCount > 0 && repostsCount > 0 ? (
            <span className="feed-post__meta-sep" aria-hidden>·</span>
          ) : null}
          {repostsCount > 0 ? (
            <button
              type="button"
              onClick={openEngagementModal('reposts')}
              className="feed-post__stats-btn"
              aria-label={`View ${repostsCount} amplifies`}
            >
              {commentsCount === 0 ? (
                <span className="feed-post__repost-pill" aria-hidden>
                  <Megaphone />
                </span>
              ) : null}
              <span>
                {formatNumber(repostsCount)} amplify{repostsCount === 1 ? '' : 's'}
              </span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="feed-post__actions">
        <button
          type="button"
          onClick={handleLike}
          disabled={loading}
          className={[
            'feed-post__action',
            isLiked ? 'feed-post__action--like-active' : '',
            loading ? 'cursor-not-allowed opacity-50' : '',
          ].join(' ')}
        >
          <Heart className={isLiked ? 'fill-current' : ''} />
          <span>Like</span>
        </button>

        <button
          type="button"
          onClick={toggleComments}
          className={['feed-post__action', showComments ? 'feed-post__action--comment-active' : ''].join(' ')}
        >
          <MessageCircle className={showComments ? 'fill-current' : ''} />
          <span>Comment</span>
        </button>

        <button
          type="button"
          onClick={handleAmplifyClick}
          aria-pressed={isReposted}
          className={[
            'feed-post__action',
            isReposted ? 'feed-post__action--repost-active' : '',
          ].join(' ')}
        >
          {isReposted ? <Check className="h-[1.125rem] w-[1.125rem] stroke-[2.5]" /> : <Megaphone />}
          <span>{isReposted ? 'Amplified' : 'Amplify'}</span>
        </button>

        <button type="button" onClick={handleShare} className="feed-post__action">
          <Share2 />
          <span>Share</span>
        </button>
      </div>

      {showComments && (
        <CommentSection
          postId={post.id}
          postOwnerId={post.user?.id}
          commentsCount={commentsCount}
          onCommentsCountChange={setCommentsCount}
          focusCommentId={focusCommentId}
        />
      )}

      {/* ── Edit modal ── */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setEditOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6 shadow-modal animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[17px] font-bold tracking-tight text-foreground">Edit post</h3>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="app-input mb-4 min-h-[120px] resize-none"
              rows={5}
            />

            <p className="mb-2 text-[13px] font-semibold text-foreground tracking-tight">Visibility</p>
            <div className="mb-4 flex flex-col gap-2">
              {[
                { value: 'public',      label: 'Public' },
                { value: 'college_only',label: 'College only' },
                { value: 'private',     label: 'Private' },
              ].map((opt) => (
                <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="edit-vis"
                    checked={editVisibility === opt.value}
                    onChange={() => setEditVisibility(opt.value)}
                    className="accent-primary"
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="app-btn-secondary"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={editSaving || (!editContent.trim() && (!post.media_urls || post.media_urls.length === 0))}
                className="app-btn-primary"
                onClick={handleSaveEdit}
              >
                {editSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmActionDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          if (!deletingPost) setDeleteConfirmOpen(open);
        }}
        title={CONFIRM_ACTION_PRESETS.deletePost.title}
        description={CONFIRM_ACTION_PRESETS.deletePost.description}
        confirmLabel={CONFIRM_ACTION_PRESETS.deletePost.confirmLabel}
        tone={CONFIRM_ACTION_PRESETS.deletePost.tone}
        icon={CONFIRM_ACTION_PRESETS.deletePost.icon}
        loading={deletingPost}
        loadingLabel="Deleting…"
        onConfirm={handleDeletePost}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
      <PostEngagementModal
        open={engagementModal === 'likes'}
        onOpenChange={(next) => setEngagementModal(next ? 'likes' : null)}
        type="likes"
        postId={post.id}
        totalCount={likesCount}
      />
      <PostEngagementModal
        open={engagementModal === 'reposts'}
        onOpenChange={(next) => setEngagementModal(next ? 'reposts' : null)}
        type="reposts"
        postId={post.id}
        totalCount={repostsCount}
        titleNoun="amplify"
      />
      <AmplifyModal
        open={amplifyOpen}
        onOpenChange={setAmplifyOpen}
        post={post}
        onAmplified={handleAmplified}
      />
      <RemoveAmplifyDialog
        open={removeAmplifyOpen}
        onOpenChange={setRemoveAmplifyOpen}
        loading={amplifyRemoving}
        onConfirm={handleConfirmRemoveAmplify}
      />
    </article>
  );
};

export default PostCard;
