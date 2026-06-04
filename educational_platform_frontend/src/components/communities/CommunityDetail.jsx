// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Users,
  Globe,
  Lock,
  Crown,
  ImagePlus,
  Camera,
  Loader2,
  Send,
  X,
  Pin,
  ChevronDown,
  Check,
  MessageCircle,
  Info,
  ListChecks,
  ArrowUpDown,
  Pencil,
  Share2,
  UserPlus,
} from 'lucide-react';
import communitiesService from '@/services/communitiesService';
import { useAuth } from '@/contexts/AuthContext';
import CommunityPostCard from './CommunityPostCard';
import CommunityMembersList from './CommunityMembersList';
import EditCommunityModal from './EditCommunityModal';
import { CommunityPostSkeleton } from './CommunitySkeleton';
import {
  mediaOrFallback,
  avatarOrFallback,
  authorAvatarSrc,
  FALLBACK_COVER,
  FALLBACK_AVATAR,
  canModerateCommunity,
} from './communityUtils';
import { validateCommunityImage } from './CommunityImageUpload';
import SocialComposer from '@/components/social/SocialComposer';
import PlatformTabs from '@/components/ui/PlatformTabs';
import socialComposerService from '@/services/socialComposerService';
import { buildComposerPayload } from '@/utils/composerPayload';

const TABS = [
  { id: 'posts',   label: 'Posts',   icon: MessageCircle },
  { id: 'about',   label: 'About',   icon: Info },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'rules',   label: 'Rules',   icon: ListChecks },
];

const SORT_OPTIONS = [
  { id: 'latest', label: 'Latest' },
  { id: 'popular', label: 'Top' },
  { id: 'comments', label: 'Most commented' },
];

function FieldRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-baseline gap-3 py-2.5">
      <p className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{label}</p>
      <p className="text-sm text-foreground/90">{value}</p>
    </div>
  );
}

export default function CommunityDetail({ communityId, onBack, onMembershipChange, onCommunityUpdated }) {
  const { user } = useAuth();
  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [sort, setSort] = useState('latest');
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(null);
  const sentinelRef = useRef(null);
  const postsLoadingRef = useRef(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(false);

  /* Composer */
  const [composeExpanded, setComposeExpanded] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [postMedia, setPostMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [posting, setPosting] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [popularTags, setPopularTags] = useState([]);
  const [postMentionedUsers, setPostMentionedUsers] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState(['General']);
  const composeRef = useRef(null);

  const loadCommunity = useCallback(async () => {
    try {
      const { community: c } = await communitiesService.getCommunityById(communityId);
      setCommunity(c);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load community');
    }
  }, [communityId]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const validationError = validateCommunityImage(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setUploadingAvatar(true);
    setError('');
    try {
      const data = await communitiesService.uploadCommunityAvatar(communityId, file);
      const url = data?.avatar_url;
      if (url) {
        setCommunity((prev) => (prev ? { ...prev, avatar_url: url } : prev));
      } else {
        await loadCommunity();
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update community logo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const validationError = validateCommunityImage(file, 'cover');
    if (validationError) {
      setError(validationError);
      return;
    }
    setUploadingCover(true);
    setError('');
    try {
      const data = await communitiesService.uploadCommunityCover(communityId, file);
      const url = data?.cover_url;
      if (url) {
        setCommunity((prev) => (prev ? { ...prev, cover_url: url } : prev));
      } else {
        await loadCommunity();
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update cover image');
    } finally {
      setUploadingCover(false);
    }
  };

  const loadPosts = useCallback(
    async (pageNum = 1, append = false, sortKey = sort) => {
      setPostsLoading(true);
      try {
        const res = await communitiesService.getCommunityPosts(communityId, {
          page: pageNum, limit: 15, sort: sortKey,
        });
        const list = res.posts || [];
        setPosts((prev) => (append ? [...prev, ...list] : list));
        const total = res.total ?? 0;
        const lim = res.limit ?? 15;
        const totalPages = Math.ceil(total / lim) || 1;
        setHasMore(pageNum < totalPages);
        setPage(pageNum);
      } catch (err) {
        if (!append) setPosts([]);
        setError(err?.response?.data?.message || 'Failed to load posts');
      } finally {
        setPostsLoading(false);
      }
    },
    [communityId, sort],
  );

  useEffect(() => {
    setLoading(true);
    setError('');
    void Promise.all([loadCommunity(), loadPosts(1)]).finally(() => setLoading(false));
  }, [loadCommunity, loadPosts]);

  useEffect(() => {
    void (async () => {
      try {
        const { categories } = await communitiesService.getCommunityCategories();
        const names = categories?.map((c) => c.name).filter(Boolean) || [];
        if (names.length) setCategoryOptions(names);
      } catch {
        /* keep defaults */
      }
    })();
  }, []);

  const handleEditCommunity = async (payload) => {
    if (!payload.name?.trim()) {
      setError('Community name is required');
      return;
    }
    setEditSubmitting(true);
    setError('');
    try {
      const { avatarFile, coverFile, ...data } = payload;
      await communitiesService.updateCommunity(communityId, data);
      const uploads = [];
      if (avatarFile) uploads.push(communitiesService.uploadCommunityAvatar(communityId, avatarFile));
      if (coverFile) uploads.push(communitiesService.uploadCommunityCover(communityId, coverFile));
      if (uploads.length) await Promise.all(uploads);
      await loadCommunity();
      setShowEditModal(false);
      onCommunityUpdated?.();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update community');
    } finally {
      setEditSubmitting(false);
    }
  };

  useEffect(() => {
    if (!sortOpen) return undefined;
    const close = (e) => { if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [sortOpen]);

  useEffect(() => { postsLoadingRef.current = postsLoading; }, [postsLoading]);
  useEffect(() => { pageRef.current = page; }, [page]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !postsLoadingRef.current) {
          void loadPosts(pageRef.current + 1, true);
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadPosts]);

  const handleJoinToggle = async () => {
    if (!community) return;
    const wasMember = !!community.is_member;
    // Optimistic
    setCommunity((c) => c ? { ...c, is_member: !wasMember, member_count: Math.max(0, (c.member_count || 0) + (wasMember ? -1 : 1)) } : c);
    setJoinLoading(true);
    try {
      if (wasMember) await communitiesService.leaveCommunity(communityId);
      else await communitiesService.joinCommunity(communityId);
      onMembershipChange?.();
    } catch (err) {
      // Rollback
      setCommunity((c) => c ? { ...c, is_member: wasMember, member_count: Math.max(0, (c.member_count || 0) + (wasMember ? 1 : -1)) } : c);
      setError(err?.response?.data?.message || 'Could not update membership');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleHeaderShare = async () => {
    try {
      const url = `${window.location.origin}${window.location.pathname}${window.location.search}`;
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const handleInviteMembers = () => {
    setActiveTab('members');
  };

  useEffect(() => {
    let cancelled = false;
    socialComposerService.getPopularHashtags(16).then((tags) => {
      if (!cancelled) setPopularTags(tags || []);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const resetCompose = () => {
    setComposeExpanded(false);
    setPostContent('');
    setPostTitle('');
    setPostMentionedUsers([]);
    setShowTitle(false);
    setPostMedia(null);
    setMediaPreview('');
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() || !community?.is_member) return;
    setPosting(true);
    try {
      const payload = buildComposerPayload(postContent, postMentionedUsers);
      const { post } = await communitiesService.createCommunityPost(communityId, {
        title: postTitle.trim(),
        content: payload.content,
        tags: payload.tags,
        mentioned_users: payload.mentioned_users,
        media: postMedia,
      });
      const selfAvatar = authorAvatarSrc(user);
      const postWithAvatar =
        selfAvatar && !post?.user_avatar
          ? { ...post, user_avatar: selfAvatar, avatar_url: selfAvatar }
          : post;
      setPosts((prev) => [postWithAvatar, ...prev]);
      resetCompose();
      setCommunity((c) => (c ? { ...c, post_count: (c.post_count || 0) + 1 } : c));
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (post) => {
    // Optimistic
    const wasLiked = !!post.is_liked;
    setPosts((prev) => prev.map((p) =>
      p.id === post.id
        ? { ...p, is_liked: !wasLiked, likes_count: Math.max(0, (p.likes_count || 0) + (wasLiked ? -1 : 1)) }
        : p,
    ));
    try {
      const { is_liked } = await communitiesService.togglePostLike(communityId, post.id);
      // Sync with server truth
      setPosts((prev) => prev.map((p) =>
        p.id === post.id
          ? { ...p, is_liked, likes_count: Math.max(0, (post.likes_count || 0) + (is_liked === wasLiked ? 0 : is_liked ? 1 : -1)) }
          : p,
      ));
    } catch {
      // Rollback
      setPosts((prev) => prev.map((p) =>
        p.id === post.id
          ? { ...p, is_liked: wasLiked, likes_count: Math.max(0, (p.likes_count || 0) + (wasLiked ? 1 : -1)) }
          : p,
      ));
    }
  };

  const handleSort = (newSort) => {
    setSort(newSort);
    setSortOpen(false);
    void loadPosts(1, false, newSort);
  };

  const onMediaPick = (file) => {
    if (!file) return;
    setPostMedia(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) onMediaPick(file);
  };

  /* Sort posts so pinned come first within Posts tab */
  const pinnedPosts = posts.filter((p) => p.is_pinned);
  const regularPosts = posts.filter((p) => !p.is_pinned);

  if (loading) {
    return (
      <div className="comm-detail">
        <div className="comm-detail-header overflow-hidden">
          <div className="h-44 animate-pulse bg-muted sm:h-52" />
          <div className="comm-detail-header__panel">
            <div className="comm-detail-header__profile">
              <div className="comm-detail-header__avatar-col">
                <div className="h-[5.75rem] w-[5.75rem] animate-pulse rounded-[0.8125rem] bg-muted sm:h-[6.75rem] sm:w-[6.75rem]" />
              </div>
              <div className="comm-detail-header__main min-w-0 flex-1 space-y-3.5">
                <div className="h-9 w-56 max-w-full animate-pulse rounded-lg bg-muted" />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <div className="h-6 w-16 animate-pulse rounded-full bg-muted/70" />
                    <div className="h-6 w-20 animate-pulse rounded-full bg-muted/70" />
                    <div className="h-6 w-24 animate-pulse rounded-full bg-muted/60" />
                  </div>
                  <div className="h-9 w-56 animate-pulse rounded-xl bg-muted/55" />
                </div>
                <div className="h-4 w-full max-w-lg animate-pulse rounded bg-muted/50" />
              </div>
            </div>
          </div>
          <div className="comm-detail-header__tabs-wrap py-3">
            <div className="h-10 animate-pulse rounded-lg bg-muted/50" />
          </div>
        </div>
        <div className="comm-post-feed">
          <CommunityPostSkeleton />
          <CommunityPostSkeleton />
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
        <p className="text-sm text-destructive">{error || 'Community not found'}</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="comm-detail animate-in fade-in slide-in-from-right-2 duration-200">
      {/* Back link */}
      <button
        type="button"
        onClick={onBack}
        className="comm-detail-back inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to communities
      </button>

      {/* Community header — refined premium */}
      <header
        className={[
          'comm-detail-header',
          community.is_member ? 'comm-detail-header--member' : '',
        ].join(' ')}
      >
        <div className="comm-detail-header__hero group/cover">
          <img
            src={mediaOrFallback(community.cover_url, FALLBACK_COVER)}
            alt=""
            className="comm-detail-header__cover-img"
          />
          <div className="comm-detail-header__cover-overlay" aria-hidden />
          {canModerateCommunity(community) && (
            <label className="comm-detail-header__cover-edit">
              {uploadingCover ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImagePlus className="h-3.5 w-3.5" />
              )}
              Edit cover
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={handleCoverUpload}
                disabled={uploadingCover}
              />
            </label>
          )}
        </div>

        <div className="comm-detail-header__panel">
          <div className="comm-detail-header__profile">
            <div className="comm-detail-header__avatar-col">
              <div className="comm-detail-header__avatar-frame">
                <img
                  src={mediaOrFallback(community.avatar_url, FALLBACK_AVATAR)}
                  alt=""
                  className="comm-detail-header__avatar"
                />
              </div>
              {canModerateCommunity(community) && (
                <label className="comm-detail-header__avatar-edit" title="Change logo">
                  {uploadingAvatar ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />
                </label>
              )}
            </div>

            <div className="comm-detail-header__main">
              <h1 className="comm-detail-header__title">{community.name}</h1>

              <div className="comm-detail-header__toolbar">
                <div className="comm-detail-header__toolbar-start">
                  <div className="comm-detail-header__meta">
                    <span
                      className={[
                        'comm-detail-header__meta-chip',
                        community.is_private
                          ? 'comm-detail-header__meta-chip--private'
                          : 'comm-detail-header__meta-chip--public',
                      ].join(' ')}
                    >
                      {community.is_private ? (
                        <Lock className="h-3 w-3" aria-hidden />
                      ) : (
                        <Globe className="h-3 w-3" aria-hidden />
                      )}
                      {community.is_private ? 'Private' : 'Public'}
                    </span>
                    {community.category ? (
                      <span className="comm-detail-header__meta-chip comm-detail-header__meta-chip--category">
                        {community.category}
                      </span>
                    ) : null}
                    {community.role === 'admin' && (
                      <span className="comm-detail-header__meta-chip comm-detail-header__meta-chip--admin">
                        <Crown className="h-3 w-3" aria-hidden />
                        Admin
                      </span>
                    )}
                    {community.role === 'moderator' && (
                      <span className="comm-detail-header__meta-chip comm-detail-header__meta-chip--mod">
                        Moderator
                      </span>
                    )}
                  </div>

                  <span
                    className="comm-detail-header__members"
                    role="status"
                    aria-label={`${community.member_count?.toLocaleString?.() ?? 0} community members`}
                  >
                    <Users className="h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden />
                    <span className="comm-detail-header__members-text">
                      <strong>{community.member_count?.toLocaleString?.() ?? 0}</strong>
                      <span className="comm-detail-header__members-label">
                        {(community.member_count ?? 0) === 1 ? 'member' : 'members'}
                      </span>
                    </span>
                  </span>
                </div>

                <div className="comm-detail-header__actions">
                  <div className="comm-detail-header__actions-group">
                    <button
                      type="button"
                      onClick={handleHeaderShare}
                      className="comm-detail-header__btn comm-detail-header__btn--secondary"
                      aria-label={shareCopied ? 'Link copied' : 'Share community'}
                    >
                      {shareCopied ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Share2 className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">
                        {shareCopied ? 'Copied' : 'Share'}
                      </span>
                    </button>
                    {community.is_member && (
                      <button
                        type="button"
                        onClick={handleInviteMembers}
                        className="comm-detail-header__btn comm-detail-header__btn--secondary"
                      >
                        <UserPlus className="h-4 w-4" />
                        <span className="hidden sm:inline">Invite</span>
                      </button>
                    )}
                    {canModerateCommunity(community) && (
                      <button
                        type="button"
                        onClick={() => setShowEditModal(true)}
                        className="comm-detail-header__btn comm-detail-header__btn--secondary"
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="hidden sm:inline">Manage</span>
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={joinLoading}
                    onClick={handleJoinToggle}
                    className={[
                      'comm-detail-header__btn',
                      community.is_member
                        ? 'comm-detail-header__btn--member'
                        : 'comm-detail-header__btn--join',
                    ].join(' ')}
                  >
                    {joinLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : community.is_member ? (
                      <>
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                        Joined
                      </>
                    ) : (
                      'Join'
                    )}
                  </button>
                </div>
              </div>

              {community.description ? (
                <p className="comm-detail-header__description">{community.description}</p>
              ) : null}
            </div>
          </div>
        </div>

        <nav className="comm-detail-header__tabs-wrap" aria-label="Community sections">
          <div className="comm-detail-header__tabs">
            <PlatformTabs
              tabs={TABS.map((t) => ({ key: t.id, label: t.label, icon: t.icon }))}
              activeKey={activeTab}
              onChange={setActiveTab}
              ariaLabel="Community sections"
            />
          </div>
        </nav>
      </header>

      {/* Inline error */}
      {error && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className="text-destructive/70 hover:text-destructive">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'posts' && (
        <>
          {/* Composer */}
          {community.is_member && (
            <div
              ref={composeRef}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={['comm-compose', dragOver ? 'comm-compose--drag' : ''].join(' ')}
            >
              <div className="comm-compose__inner">
                <img
                  src={avatarOrFallback(user, undefined, user)}
                  alt=""
                  className="comm-compose__avatar"
                />
                <div className="min-w-0 flex-1">
                  {showTitle && (
                    <input
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      placeholder="Post title (optional)"
                      maxLength={120}
                      className="comm-compose__title"
                    />
                  )}
                  <SocialComposer
                    id="community-post-composer"
                    className="comm-compose-social"
                    value={postContent}
                    onValueChange={setPostContent}
                    onFocus={() => setComposeExpanded(true)}
                    onMentionedUsersChange={setPostMentionedUsers}
                    popularTags={popularTags}
                    mentionMode="all"
                    placeholder={`Share something with ${community.name}… Use @ to mention, # for topics`}
                    rows={composeExpanded ? 4 : 1}
                    textareaClassName="comm-compose__field"
                    hideFooter
                    clearOnSubmit={false}
                    showHint={false}
                  />

                  {mediaPreview && (
                    <div className="comm-compose__preview">
                      <img src={mediaPreview} alt="" className="max-h-56 max-w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setPostMedia(null); setMediaPreview(''); }}
                        aria-label="Remove image"
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {(composeExpanded || postContent) && (
                    <div className="comm-compose__toolbar">
                      <div className="comm-compose__tools">
                        <label className="comm-compose__tool">
                          <ImagePlus className="h-4 w-4" />
                          Image
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => onMediaPick(e.target.files?.[0])}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowTitle((v) => !v)}
                          className={['comm-compose__tool', showTitle ? 'comm-compose__tool--active' : ''].join(' ')}
                        >
                          {showTitle ? 'Hide title' : 'Add title'}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={resetCompose}
                          className="comm-compose__tool"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={posting || !postContent.trim()}
                          onClick={handleCreatePost}
                          className="comm-compose__submit"
                        >
                          {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          Post
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Posts list */}
          <div className="comm-post-feed">
            {posts.length > 0 && (
              <div className="comm-feed-chrome comm-post-feed__chrome">
                <p className="comm-feed-chrome__count">
                  {pinnedPosts.length > 0 ? `${pinnedPosts.length} pinned · ` : ''}
                  {posts.length} post{posts.length === 1 ? '' : 's'}
                </p>
                <div className="relative" ref={sortRef}>
                  <button
                    type="button"
                    onClick={() => setSortOpen((v) => !v)}
                    className="comm-feed-chrome__sort-btn"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                    {SORT_OPTIONS.find((o) => o.id === sort)?.label || 'Sort'}
                    <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {sortOpen && (
                    <div className="comm-feed-chrome__sort-menu">
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSort(opt.id)}
                          className={[
                            'comm-feed-chrome__sort-item',
                            sort === opt.id ? 'comm-feed-chrome__sort-item--active' : '',
                          ].join(' ')}
                        >
                          {opt.label}
                          {sort === opt.id ? <Check className="h-3.5 w-3.5" /> : null}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {pinnedPosts.length > 0 && (
              <div className="space-y-3">
                <p className="comm-feed-chrome__pinned-label">
                  <Pin className="h-3 w-3" />
                  Pinned
                </p>
                {pinnedPosts.map((post) => (
                  <CommunityPostCard
                    key={post.id}
                    post={post}
                    community={community}
                    onLikeToggle={handleLike}
                    onDelete={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                    onUpdate={(updated) =>
                      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
                    }
                  />
                ))}
              </div>
            )}

            {/* Regular posts */}
            {postsLoading && posts.length === 0 ? (
              <>
                <CommunityPostSkeleton />
                <CommunityPostSkeleton />
              </>
            ) : posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 py-16 text-center">
                <MessageCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm font-medium text-foreground">No posts yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {community.is_member ? 'Be the first to start a conversation.' : 'Join to participate.'}
                </p>
              </div>
            ) : (
              regularPosts.map((post) => (
                <CommunityPostCard
                  key={post.id}
                  post={post}
                  community={community}
                  onLikeToggle={handleLike}
                  onDelete={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                  onUpdate={(updated) =>
                    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
                  }
                />
              ))
            )}

            <div ref={sentinelRef} className="flex h-10 items-center justify-center">
              {postsLoading && hasMore && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/50" />
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'about' && (
        <div className="comm-detail-tab-panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">About this community</h2>
            {canModerateCommunity(community) && (
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit details
              </button>
            )}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground/85">
            {community.description || 'No description provided yet.'}
          </p>
          <div className="mt-4 divide-y divide-border/50">
            <FieldRow label="Category" value={community.category} />
            <FieldRow label="Visibility" value={community.is_private ? 'Private · college only' : 'Public · all colleges'} />
            <FieldRow label="Members" value={(community.member_count ?? 0).toLocaleString?.()} />
            <FieldRow label="Posts" value={community.post_count ?? 0} />
            {community.created_at && (
              <FieldRow
                label="Created"
                value={new Date(community.created_at).toLocaleDateString(undefined, {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              />
            )}
          </div>

          {Array.isArray(community.tags) && community.tags.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Tags</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {community.tags.map((t) => (
                  <span key={t} className="rounded-md bg-primary/[0.06] px-2 py-1 text-xs font-medium text-primary">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'members' && (
        <div className="comm-detail-tab-panel">
          <CommunityMembersList community={community} onChange={() => { void loadCommunity(); onMembershipChange?.(); }} />
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="comm-detail-tab-panel">
          <h2 className="text-base font-semibold text-foreground">Community rules</h2>
          {Array.isArray(community.rules) && community.rules.length > 0 ? (
            <ol className="mt-3 space-y-3">
              {community.rules.map((r, idx) => (
                <li key={`${idx}-${r}`} className="flex gap-3 rounded-xl bg-muted/30 p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-bold text-primary">
                    {idx + 1}
                  </span>
                  <p className="text-sm text-foreground/90">{r}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
              No rules set yet.
            </p>
          )}
        </div>
      )}

      <EditCommunityModal
        open={showEditModal}
        community={community}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditCommunity}
        submitting={editSubmitting}
        categoryOptions={['all', ...categoryOptions]}
      />
    </div>
  );
}
