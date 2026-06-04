import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageCircle, Repeat2, Heart, MoreHorizontal, Share2, Bookmark, Award,
  TrendingUp, Eye, Image, Video, FileText, Pencil, Trash2, X, Copy, Check,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import postService, { resolveMediaUrl } from '@/services/postService';
import ClickableUser from '@/components/ui/ClickableUser';
import { PRESENCE_STATUS } from '@/lib/presence';
import bookmarkService from '@/services/bookmarkService';
import { emitNotificationsChanged } from '@/services/notificationService';
import RichPostText from '@/components/RichPostText';
import CommentSection from '@/components/comments/CommentSection';

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

/* ─── CodeBlock ─────────────────────────────────────────────────── */
const CODE_SEPARATOR = '\n\n---\n\n';

const LANG_META = {
  javascript: { label: 'JavaScript', color: 'text-yellow-400', ext: 'js'    },
  typescript: { label: 'TypeScript', color: 'text-blue-400',   ext: 'ts'    },
  python:     { label: 'Python',     color: 'text-green-400',  ext: 'py'    },
  java:       { label: 'Java',       color: 'text-orange-400', ext: 'java'  },
  cpp:        { label: 'C++',        color: 'text-cyan-400',   ext: 'cpp'   },
  csharp:     { label: 'C#',         color: 'text-violet-400', ext: 'cs'    },
  go:         { label: 'Go',         color: 'text-sky-400',    ext: 'go'    },
  rust:       { label: 'Rust',       color: 'text-orange-300', ext: 'rs'    },
  php:        { label: 'PHP',        color: 'text-indigo-400', ext: 'php'   },
  ruby:       { label: 'Ruby',       color: 'text-red-400',    ext: 'rb'    },
  swift:      { label: 'Swift',      color: 'text-orange-500', ext: 'swift' },
  kotlin:     { label: 'Kotlin',     color: 'text-violet-300', ext: 'kt'    },
  html:       { label: 'HTML',       color: 'text-red-300',    ext: 'html'  },
  css:        { label: 'CSS',        color: 'text-sky-300',    ext: 'css'   },
  sql:        { label: 'SQL',        color: 'text-green-300',  ext: 'sql'   },
};

function parseCodeContent(raw) {
  /* try multiple separator variants to survive backend whitespace normalization */
  const SEPS = ['\n\n---\n\n', '\r\n\r\n---\r\n\r\n', '\n---\n', '\r\n---\r\n'];
  for (const sep of SEPS) {
    const idx = raw.indexOf(sep);
    if (idx !== -1) {
      return {
        description: raw.slice(0, idx).trim(),
        code: raw.slice(idx + sep.length),
      };
    }
  }
  return { description: '', code: raw };
}

/* CodeBlock receives ONLY the raw code string — no description handling here */
function CodeBlock({ content, language }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  }, [content]);

  const meta = language ? (LANG_META[language.toLowerCase()] ?? null) : null;
  const langLabel = meta?.label ?? (language ? language.charAt(0).toUpperCase() + language.slice(1) : 'Code');
  const langColor = meta?.color ?? 'text-violet-300';
  const fileName = `snippet.${meta?.ext ?? 'txt'}`;

  return (
    <div className="overflow-hidden rounded-xl border border-violet-300/30 bg-[#0d1117] shadow-md">

      {/* ── Title bar ── */}
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#1c2128] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </span>
          <span className="font-mono text-[11px] text-gray-500">{fileName}</span>
          <span className={`font-mono text-[11px] font-semibold ${langColor}`}>{langLabel}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition-all duration-150 hover:bg-white/8 hover:text-gray-200"
          aria-label="Copy code"
        >
          {copied
            ? <><Check className="h-3.5 w-3.5 text-green-400" /><span className="text-green-400">Copied</span></>
            : <><Copy className="h-3.5 w-3.5" /><span>Copy</span></>
          }
        </button>
      </div>

      {/* ── Code ── */}
      <pre className="max-h-[320px] overflow-y-auto overflow-x-auto px-4 py-4 text-[13px] leading-relaxed text-gray-100">
        <code className="font-mono whitespace-pre">{content}</code>
      </pre>
    </div>
  );
}

/* ─── PostCard ──────────────────────────────────────────────────── */
const PostCard = ({ post, onPostDeleted, onPostEdited, onNavigate }) => {
  const { user } = useAuth();
  const [isLiked,           setIsLiked]           = useState(post.is_liked);
  const [isBookmarked,      setIsBookmarked]       = useState(post.is_bookmarked);
  const [showComments,      setShowComments]       = useState(false);
  const [likesCount,        setLikesCount]         = useState(post.likes_count);
  const [commentsCount,     setCommentsCount]      = useState(post.comments_count);
  const [loading,           setLoading]            = useState(false);
  const [shareFeedback,     setShareFeedback]      = useState('');
  const [menuOpen,          setMenuOpen]           = useState(false);
  const [editOpen,          setEditOpen]           = useState(false);
  const [editContent,       setEditContent]        = useState(post.content);
  const [editVisibility,    setEditVisibility]     = useState(post.visibility);
  const [editSaving,        setEditSaving]         = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen]  = useState(false);
  const [deletingPost,      setDeletingPost]       = useState(false);
  const menuRef = useRef(null);

  const isOwner = user?.id && post.user?.id && String(user.id) === String(post.user.id);

  useEffect(() => {
    setIsLiked(post.is_liked);
    setLikesCount(post.likes_count);
    setCommentsCount(post.comments_count);
    setIsBookmarked(post.is_bookmarked);
  }, [post.id, post.is_liked, post.likes_count, post.comments_count, post.is_bookmarked]);

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

  const handleRepost = async () => {
    const line = (post.content || '').trim().slice(0, 120);
    const text  = line ? `Repost: ${line}${line.length >= 120 ? '…' : ''}\n${postShareUrl}` : postShareUrl;
    try { await navigator.clipboard.writeText(text); flashFeedback('Repost text copied'); }
    catch { flashFeedback('Could not copy'); }
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
    image:    { icon: <Image    className="h-3.5 w-3.5 text-sky-500"     />, label: 'Image' },
    video:    { icon: <Video    className="h-3.5 w-3.5 text-emerald-500" />, label: 'Video' },
    code:     { icon: <FileText className="h-3.5 w-3.5 text-violet-500"  />, label: `Code${post.code_language ? ` · ${post.code_language}` : ''}` },
    question: { icon: <MessageCircle className="h-3.5 w-3.5 text-rose-500" />, label: 'Question' },
    update:   { icon: <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />, label: 'Update' },
  };
  const typeMeta = POST_TYPE_META[post.type] ?? {
    icon: <FileText className="h-3.5 w-3.5 text-muted-foreground" />, label: 'Post',
  };

  const visibilityLabel =
    post.visibility === 'private' ? 'Private'
    : post.visibility === 'college_only' ? 'College'
    : 'Public';

  const displayContent = (post.content || '').trim();

  /* ── action button shared classes ── */
  const actionBtn = (extraClass = '') =>
    `post-action-btn ${extraClass}`;

  return (
    <article
      id={`post-${post.id}`}
      className="social-feed-card group"
    >
      {/* Share feedback toast */}
      {shareFeedback && (
        <div
          className="mb-3 flex items-center justify-center gap-1.5 rounded-lg bg-foreground/90 px-3 py-2 text-xs font-medium text-background animate-fade-scale"
          role="status"
        >
          {shareFeedback}
        </div>
      )}

      {/* ── Header ── */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <ClickableUser
            userId={post.user?.id}
            name={post.user?.name}
            avatarUrl={post.user?.avatar_url || FALLBACK_AVATAR}
            size="md"
            showStatus
            status={PRESENCE_STATUS.ONLINE}
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <ClickableUser
                userId={post.user?.id}
                name={post.user?.name}
                showName
                showAvatar={false}
                showStatus={false}
                nameClassName="text-[14px] font-bold tracking-tight text-foreground"
                className="inline-flex !gap-0 !p-0 hover:!bg-transparent"
              />
              <Award className="h-3.5 w-3.5 text-primary" />
              <span className="text-[12px] font-medium text-muted-foreground">· {formatTimeAgo(post.created_at)}</span>
              <span className="rounded-full bg-muted/70 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground ring-1 ring-border/40">
                {visibilityLabel}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-[12.5px] font-medium text-muted-foreground tracking-tight">{post.user?.title || 'Student'}</p>
              <span className="text-muted-foreground/40">·</span>
              <div className="flex items-center gap-1">
                {typeMeta.icon}
                <span className="text-[11.5px] font-medium text-muted-foreground tracking-tight">{typeMeta.label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions (bookmark + menu) */}
        <div className="relative flex shrink-0 items-center gap-0.5" ref={menuRef}>
          <button
            type="button"
            onClick={handleBookmark}
            disabled={loading}
            className={[
              'rounded-lg p-2 transition-all duration-150 active:scale-95',
              isBookmarked
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-primary/5 hover:text-primary',
              loading ? 'cursor-not-allowed opacity-50' : '',
            ].join(' ')}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
          >
            <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-lg p-2 text-muted-foreground transition-colors duration-150 hover:bg-muted"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-1.5 min-w-[160px] overflow-hidden rounded-xl border border-border/60 bg-card py-1 shadow-elevated animate-fade-scale">
              {isOwner ? (
                <>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted/70"
                    onClick={() => { setEditOpen(true); setMenuOpen(false); }}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                    Edit post
                  </button>
                  <div className="my-1 border-t border-border/50" />
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/5"
                    onClick={() => { setDeleteConfirmOpen(true); setMenuOpen(false); }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete post
                  </button>
                </>
              ) : (
                <span className="block px-4 py-2.5 text-xs text-muted-foreground">Post options</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      {displayContent && (
        <div className="mb-4">
          {post.type === 'code' ? (() => {
            const { description, code } = parseCodeContent(post.content);
            return (
              <>
                {description ? (
                  <RichPostText text={description} className="mb-3 text-sm leading-relaxed text-foreground" />
                ) : null}
                <CodeBlock content={code} language={post.code_language} />
              </>
            );
          })() : (
            <RichPostText text={post.content} className="text-sm leading-relaxed text-foreground" />
          )}
        </div>
      )}

      {/* ── Media ── */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div className="mb-4 space-y-2 overflow-hidden rounded-xl border border-border/60 bg-muted/20">
          {post.media_urls.map((media, idx) => {
            const rawUrl = typeof media === 'string' ? media : (media.url || media.storage_key);
            const url = resolveMediaUrl(
              rawUrl && !String(rawUrl).startsWith('http') && media?.storage_key
                ? `/media/${String(media.storage_key).replace(/^\/+/, '')}`
                : rawUrl,
            );
            const explicitType = typeof media === 'string' ? 'image' : (media.type || 'image');
            const isVideo = explicitType === 'video' || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
            const isImage =
              !isVideo &&
              (explicitType === 'image' ||
                /\.(jpg|jpeg|png|gif|webp|svg|heic|heif|bmp)(\?|$)/i.test(url));

            if (!url) return null;

            if (isImage) {
              return (
                <img
                  key={idx}
                  src={url}
                  alt="Post media"
                  loading="lazy"
                  className="max-h-[28rem] w-full bg-muted object-contain"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '';
                    e.currentTarget.alt = 'Image could not be loaded';
                    e.currentTarget.className =
                      'flex min-h-[120px] w-full items-center justify-center bg-muted px-4 py-8 text-center text-sm text-muted-foreground';
                  }}
                />
              );
            }
            if (isVideo) {
              return (
                <video
                  key={idx}
                  src={url}
                  controls
                  playsInline
                  preload="metadata"
                  className="max-h-[28rem] w-full bg-black object-contain"
                />
              );
            }
            return (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full p-4 text-sm font-medium text-primary hover:underline"
              >
                View attachment
                {typeof media === 'object' && media.metadata?.originalName
                  ? `: ${media.metadata.originalName}`
                  : ''}
              </a>
            );
          })}
        </div>
      )}

      {/* ── Stats row ── */}
      <div className="mb-3 flex items-center gap-4 border-y border-border/40 py-2.5 text-[12.5px] font-medium text-muted-foreground tracking-tight">
        <button
          type="button"
          onClick={handleLike}
          disabled={loading}
          className="flex items-center gap-1.5 transition-colors hover:text-rose-500"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500">
            <Heart className="h-3 w-3 text-white" />
          </span>
          <span className="font-medium">{formatNumber(likesCount)}</span>
        </button>
        <button
          type="button"
          onClick={toggleComments}
          className="flex items-center gap-1.5 transition-colors hover:text-primary"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="font-medium">{formatNumber(commentsCount)}</span>
        </button>
        <div className="flex items-center gap-1.5">
          <Eye className="h-4 w-4" />
          <span>{formatNumber(post.views_count)}</span>
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={handleLike}
          disabled={loading}
          className={[
            isLiked ? 'post-action-btn-like bg-rose-50 text-rose-600' : 'post-action-btn-like',
            loading ? 'cursor-not-allowed opacity-50' : '',
          ].join(' ')}
        >
          <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
          Like
        </button>

        <button
          type="button"
          onClick={toggleComments}
          className="post-action-btn-comment"
        >
          <MessageCircle className="h-4 w-4" />
          Comment
        </button>

        <button
          type="button"
          onClick={handleRepost}
          className="post-action-btn-repost"
        >
          <Repeat2 className="h-4 w-4" />
          Repost
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="post-action-btn-share"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
      </div>

      {showComments && (
        <CommentSection
          postId={post.id}
          postOwnerId={post.user?.id}
          commentsCount={commentsCount}
          onCommentsCountChange={setCommentsCount}
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

      {/* ── Delete confirm modal ── */}
      {deleteConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => !deletingPost && setDeleteConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-modal animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="mt-3 text-[17px] font-bold tracking-tight text-foreground">Delete post?</h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
              This action cannot be undone. Comments and likes will be permanently removed.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="app-btn-secondary"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingPost}
                className="btn-danger"
                onClick={handleDeletePost}
              >
                {deletingPost ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
};

export default PostCard;
