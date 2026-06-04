// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Users,
  Search,
  Plus,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Compass,
  X,
  Hash,
  Loader2,
} from 'lucide-react';
import communitiesService from '@/services/communitiesService';
import PageHeader from '@/components/ui/PageHeader';
import ModuleFeedTabs from '@/components/ui/ModuleFeedTabs';
import CommunityActivityWidget from './CommunityActivityWidget';
import EmptyState from '@/components/ui/EmptyState';
import CommunityCard from './CommunityCard';
import CommunityDetail from './CommunityDetail';
import CreateCommunityModal from './CreateCommunityModal';
import { mediaOrFallback, FALLBACK_AVATAR, formatCountLabel } from './communityUtils';
import {
  CommunityCardSkeleton,
  FeaturedSidebarSkeleton,
} from './CommunitySkeleton';

const TABS = [
  { id: 'discover',        label: 'Discover',       icon: Compass },
  { id: 'my-communities',  label: 'My Communities', icon: Users },
  { id: 'trending',        label: 'Trending',       icon: TrendingUp },
];

export default function CommunitiesPage() {
  const [activeTab, setActiveTab] = useState('discover');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categoryOptions, setCategoryOptions] = useState(['all']);
  const [communities, setCommunities] = useState([]);
  const [feedPosts, setFeedPosts] = useState([]);
  const [featuredSidebar, setFeaturedSidebar] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [myCommunitiesList, setMyCommunitiesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [selectedCommunityId, setSelectedCommunityId] = useState(null);
  const [joinLoadingId, setJoinLoadingId] = useState(null);
  const [commPage, setCommPage] = useState(1);
  const [commHasMore, setCommHasMore] = useState(false);
  const [commLoadingMore, setCommLoadingMore] = useState(false);
  const [selectedTag, setSelectedTag] = useState('');
  const commSentinelRef = useRef(null);
  const anyLoadingRef = useRef(false);
  const commPageRef = useRef(1);
  const commHasMoreRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    const p = sessionStorage.getItem('communities_search_prefill');
    if (!p) return;
    sessionStorage.removeItem('communities_search_prefill');
    setSearchTerm(p);
    setDebouncedSearch(p);
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const { categories } = await communitiesService.getCommunityCategories();
      const names = categories.map((c) => c.name).filter(Boolean);
      setCategoryOptions(['all', ...names]);
    } catch {
      setCategoryOptions(['all', 'Technology', 'Science', 'Education', 'Business', 'Arts', 'General']);
    }
  }, []);

  const loadFeaturedSidebar = useCallback(async () => {
    setFeaturedLoading(true);
    try {
      const { communities: feat } = await communitiesService.getFeaturedCommunities();
      setFeaturedSidebar(feat || []);
    } catch {
      setFeaturedSidebar([]);
    } finally {
      setFeaturedLoading(false);
    }
  }, []);

  const refreshMyMembershipList = useCallback(async () => {
    try {
      const r = await communitiesService.getUserCommunities({ limit: 100, page: 1 });
      setMyCommunitiesList(r.communities || []);
    } catch {
      /* sidebar */
    }
  }, []);

  const loadDiscoverOrTrending = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) setLoading(true);
    else setCommLoadingMore(true);
    setError('');
    try {
      const trending = activeTab === 'trending';
      const res = await communitiesService.getCommunities({
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        search: debouncedSearch.trim() || undefined,
        limit: 24,
        page: pageNum,
        trending: trending || undefined,
        sort: trending ? 'popular' : 'latest',
      });
      const list = res.communities || [];
      setCommunities((prev) => (append ? [...prev, ...list] : list));
      const total = res.total ?? list.length;
      const totalPages = Math.ceil(total / 24) || 1;
      setCommHasMore(pageNum < totalPages);
      setCommPage(pageNum);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load communities');
      if (!append) setCommunities([]);
    } finally {
      setLoading(false);
      setCommLoadingMore(false);
    }
  }, [activeTab, selectedCategory, debouncedSearch]);

  const loadMy = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [userRes, feedRes] = await Promise.all([
        communitiesService.getUserCommunities({ limit: 100, page: 1 }),
        communitiesService.getMyCommunitiesFeed({ limit: 30, page: 1 }),
      ]);
      setMyCommunitiesList(userRes.communities || []);
      setFeedPosts(feedRes.posts || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load your communities');
      setMyCommunitiesList([]);
      setFeedPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
    void loadFeaturedSidebar();
    void refreshMyMembershipList();
  }, [loadCategories, loadFeaturedSidebar, refreshMyMembershipList]);

  useEffect(() => {
    if (selectedCommunityId) return;
    if (activeTab === 'my-communities') void loadMy();
    else void loadDiscoverOrTrending();
  }, [activeTab, loadMy, loadDiscoverOrTrending, selectedCommunityId]);

  useEffect(() => { anyLoadingRef.current = loading || commLoadingMore; }, [loading, commLoadingMore]);
  useEffect(() => { commPageRef.current = commPage; }, [commPage]);
  useEffect(() => { commHasMoreRef.current = commHasMore; }, [commHasMore]);

  useEffect(() => {
    const el = commSentinelRef.current;
    if (!el || activeTab === 'my-communities') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && commHasMoreRef.current && !anyLoadingRef.current) {
          void loadDiscoverOrTrending(commPageRef.current + 1, true);
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadDiscoverOrTrending, activeTab]);

  const refresh = () => {
    void loadFeaturedSidebar();
    if (activeTab === 'my-communities') void loadMy();
    else void loadDiscoverOrTrending();
    void refreshMyMembershipList();
  };

  /* Optimistic Join/Leave across all lists */
  const handleJoinToggle = async (c) => {
    const wasMember = !!c.is_member;
    const delta = wasMember ? -1 : 1;

    const patch = (item) =>
      item.id === c.id
        ? { ...item, is_member: !wasMember, member_count: Math.max(0, (item.member_count || 0) + delta) }
        : item;

    setCommunities((prev) => prev.map(patch));
    setFeaturedSidebar((prev) => prev.map(patch));
    setMyCommunitiesList((prev) =>
      wasMember
        ? prev.filter((item) => item.id !== c.id)
        : [{ ...c, is_member: true, member_count: (c.member_count || 0) + 1 }, ...prev],
    );

    setJoinLoadingId(c.id);
    setError('');
    try {
      if (wasMember) await communitiesService.leaveCommunity(c.id);
      else await communitiesService.joinCommunity(c.id);
      void loadFeaturedSidebar();
      if (activeTab === 'my-communities') void loadMy();
    } catch (err) {
      // Rollback
      const rollback = (item) =>
        item.id === c.id
          ? { ...item, is_member: wasMember, member_count: Math.max(0, (item.member_count || 0) - delta) }
          : item;
      setCommunities((prev) => prev.map(rollback));
      setFeaturedSidebar((prev) => prev.map(rollback));
      void refreshMyMembershipList();
      setError(err?.response?.data?.message || 'Could not update membership');
    } finally {
      setJoinLoadingId(null);
    }
  };

  const handleCreateCommunity = async (payload) => {
    if (!payload.name) {
      setError('Community name is required');
      return;
    }
    setCreateSubmitting(true);
    setError('');
    try {
      const { avatarFile, coverFile, ...communityData } = payload;
      const { community } = await communitiesService.createCommunity(communityData);
      if (community?.id) {
        const uploads = [];
        if (avatarFile) {
          uploads.push(communitiesService.uploadCommunityAvatar(community.id, avatarFile));
        }
        if (coverFile) {
          uploads.push(communitiesService.uploadCommunityCover(community.id, coverFile));
        }
        if (uploads.length) await Promise.all(uploads);
      }
      setShowCreateModal(false);
      setActiveTab('my-communities');
      await refreshMyMembershipList();
      await loadDiscoverOrTrending();
      await loadFeaturedSidebar();
      if (community?.id) setSelectedCommunityId(community.id);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create community');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleFeedLike = async (post) => {
    // Optimistic
    const wasLiked = !!post.is_liked;
    setFeedPosts((prev) => prev.map((p) =>
      p.id === post.id
        ? { ...p, is_liked: !wasLiked, likes_count: Math.max(0, (p.likes_count || 0) + (wasLiked ? -1 : 1)) }
        : p,
    ));
    try {
      const { is_liked } = await communitiesService.togglePostLike(post.community_id, post.id);
      setFeedPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, is_liked } : p)));
    } catch {
      // Rollback
      setFeedPosts((prev) => prev.map((p) =>
        p.id === post.id
          ? { ...p, is_liked: wasLiked, likes_count: Math.max(0, (p.likes_count || 0) + (wasLiked ? 1 : -1)) }
          : p,
      ));
    }
  };

  const displayList = useMemo(() => {
    const base = activeTab === 'my-communities' ? myCommunitiesList : communities;
    if (!selectedTag) return base;
    return base.filter((c) => (c.tags || []).includes(selectedTag));
  }, [activeTab, myCommunitiesList, communities, selectedTag]);

  const feedTabs = TABS.map((tab) => ({
    key: tab.id,
    label: tab.label,
    icon: tab.icon,
  }));

  const trendingTags = useMemo(() => {
    const freq = {};
    communities.forEach((c) => {
      (c.tags || []).forEach((tag) => { freq[tag] = (freq[tag] || 0) + 1; });
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));
  }, [communities]);

  const featuredTopByMembers = useMemo(() => {
    return [...featuredSidebar]
      .sort((a, b) => (b.member_count ?? 0) - (a.member_count ?? 0))
      .slice(0, 5);
  }, [featuredSidebar]);

  if (selectedCommunityId) {
    return (
      <div className="platform-page">
        <div className="platform-page__container comm-page-stack">
          <CommunityDetail
            communityId={selectedCommunityId}
            onBack={() => {
              setSelectedCommunityId(null);
              refresh();
            }}
            onMembershipChange={refreshMyMembershipList}
            onCommunityUpdated={() => {
              void loadDiscoverOrTrending();
              void loadFeaturedSidebar();
              void refreshMyMembershipList();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="platform-page">
      <div className="platform-page__container comm-page-stack">
        {/* Premium hero header */}
        <PageHeader
          icon={Users}
          badge="Groups & spaces"
          title="Communities"
          description="College groups and cross-campus public spaces. Join shared interests or start your own."
          variant="emerald"
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={refresh}
                aria-label="Refresh"
                title="Refresh"
                className="rounded-xl border border-white/30 bg-white/10 p-2.5 text-white backdrop-blur transition-colors hover:bg-white/20"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="platform-hero__cta text-emerald-700 hover:bg-emerald-50"
              >
                <Plus className="h-4 w-4" />
                Create community
              </button>
            </div>
          }
        />

        <div className="comm-feed-tabs">
          <ModuleFeedTabs
            shellClassName="comm-feed-tabs__shell"
            className="comm-feed-tabs__tabs"
            tabs={feedTabs}
            activeKey={activeTab}
            onChange={(id) => {
              setActiveTab(id);
              setSelectedTag('');
            }}
            ariaLabel="Community sections"
          />
        </div>

        <CommunityActivityWidget
          className="lg:hidden"
          joined={myCommunitiesList.length}
          discoverCount={communities.length}
          featuredCount={featuredSidebar.length}
          feedPostsCount={feedPosts.length}
        />

        <div className="comm-page-layout">
          <main className="comm-page-main">
            {error && (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/[0.06] px-4 py-3 text-sm text-destructive">
                <span>{error}</span>
                <button type="button" onClick={() => setError('')} className="shrink-0 text-destructive/70 hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Search + filters (Discover & Trending) */}
            {activeTab !== 'my-communities' && (
              <div className="platform-toolbar">
                <div className="comm-toolbar-row">
                  <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                  <input
                    type="text"
                    placeholder="Search communities…"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setSelectedTag(''); }}
                    className="platform-search"
                    aria-label="Search communities"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      aria-label="Clear search"
                      className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  </div>
                </div>

                <div className="comm-category-row">
                  {categoryOptions.map((category) => {
                    const isActive = selectedCategory === category;
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => { setSelectedCategory(category); setSelectedTag(''); }}
                        className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'border border-border/60 bg-card text-muted-foreground hover:border-emerald-200 hover:bg-emerald-50/50 hover:text-emerald-800'
                        }`}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedTag && activeTab !== 'my-communities' && (
              <div className="comm-tag-filter">
                <span className="text-xs font-medium text-muted-foreground">Filtered by</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  <Hash className="h-3 w-3" />
                  {selectedTag}
                  <button
                    type="button"
                    onClick={() => setSelectedTag('')}
                    aria-label="Clear tag filter"
                    className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              </div>
            )}

            {loading ? (
              activeTab === 'my-communities' ? (
                <div className="comm-grid">
                  <CommunityCardSkeleton />
                  <CommunityCardSkeleton />
                </div>
              ) : (
                <div className="comm-grid">
                  {[1, 2, 3, 4, 5, 6].map((i) => <CommunityCardSkeleton key={i} />)}
                </div>
              )
            ) : activeTab === 'my-communities' ? (
              myCommunitiesList.length > 0 ? (
                <section>
                  <div className="comm-section-head">
                    <h2 className="comm-section-title">Your communities</h2>
                    <span className="comm-section-meta">{myCommunitiesList.length} joined</span>
                  </div>
                  <div className="comm-grid">
                    {myCommunitiesList.map((c) => (
                      <CommunityCard
                        key={c.id}
                        community={c}
                        onOpen={(comm) => setSelectedCommunityId(comm.id)}
                        onJoinToggle={handleJoinToggle}
                        joinLoading={joinLoadingId === c.id}
                      />
                    ))}
                  </div>
                </section>
              ) : (
                <EmptyState
                  icon={Users}
                  title="You haven't joined any communities"
                  description="Discover groups around your interests and start joining the conversation."
                  action={
                    <button
                      type="button"
                      onClick={() => setActiveTab('discover')}
                      className="platform-hero__cta inline-flex items-center gap-2 text-emerald-700 hover:bg-emerald-50"
                    >
                      <Compass className="h-4 w-4" />
                      Discover communities
                    </button>
                  }
                />
              )
            ) : displayList.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No communities match your filters"
                description="Try a different search term or category, or create a new community."
                action={
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="platform-hero__cta inline-flex items-center gap-2 text-emerald-700 hover:bg-emerald-50"
                  >
                    <Plus className="h-4 w-4" />
                    Create a community
                  </button>
                }
              />
            ) : (
              <div className="platform-stagger comm-grid">
                {displayList.map((c) => (
                  <CommunityCard
                    key={c.id}
                    community={c}
                    onOpen={(comm) => setSelectedCommunityId(comm.id)}
                    onJoinToggle={handleJoinToggle}
                    joinLoading={joinLoadingId === c.id}
                  />
                ))}
              </div>
            )}

            {activeTab !== 'my-communities' && (
              <div ref={commSentinelRef} className="flex h-10 items-center justify-center">
                {commLoadingMore && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/50" />}
              </div>
            )}
          </main>

          <aside className="comm-page-rail">
            <CommunityActivityWidget
              className="hidden lg:block"
              joined={myCommunitiesList.length}
              discoverCount={communities.length}
              featuredCount={featuredSidebar.length}
              feedPostsCount={feedPosts.length}
            />

            <div className="platform-rail-card">
              <h3 className="platform-rail-card__title mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 shrink-0 text-emerald-600" />
                Featured
              </h3>
              {featuredLoading ? (
                <FeaturedSidebarSkeleton />
              ) : featuredTopByMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground">No featured communities yet.</p>
              ) : (
                <div className="space-y-0.5">
                  {featuredTopByMembers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCommunityId(c.id)}
                      className="group flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-muted/60"
                    >
                      <img
                        src={mediaOrFallback(c.avatar_url, FALLBACK_AVATAR)}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-xl object-cover ring-1 ring-border/40"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                          {c.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatCountLabel(c.member_count ?? 0, 'member')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

          {trendingTags.length > 0 && activeTab !== 'my-communities' && (
            <div className="platform-rail-card">
              <h3 className="platform-rail-card__title mb-3 flex items-center gap-2">
                <Hash className="h-4 w-4 shrink-0 text-emerald-600" />
                Trending tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {trendingTags.map(({ tag, count }) => {
                  const isActive = selectedTag === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => { setSelectedTag(isActive ? '' : tag); if (activeTab === 'my-communities') setActiveTab('discover'); }}
                      className={`group inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'border border-border/50 bg-card text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary'
                      }`}
                    >
                      <Hash className="h-3 w-3 shrink-0" />
                      {tag}
                      <span className={`text-[10px] ${isActive ? 'text-primary-foreground/70' : 'text-muted-foreground/60 group-hover:text-primary/60'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          </aside>
        </div>
      </div>

      <CreateCommunityModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateCommunity}
        submitting={createSubmitting}
        categoryOptions={categoryOptions}
      />
    </div>
  );
}
