// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Search,
  Upload,
  Grid,
  List,
  Loader2,
  RefreshCw,
  TrendingUp,
  Clock,
  FolderOpen,
  Bookmark,
  X,
  Download,
  Eye,
  Building2,
} from 'lucide-react';
import resourceLibraryService from '@/services/resourceLibraryService';
import bookmarkService from '@/services/bookmarkService';
import ResourceCard from './ResourceCard';
import ResourcePreviewModal from './ResourcePreviewModal';
import UploadResourceModal from './UploadResourceModal';
import PageHeader from '@/components/ui/PageHeader';
import PlatformSelect from '@/components/ui/PlatformSelect';
import ModuleFeedTabs from '@/components/ui/ModuleFeedTabs';
import ModuleStatsGrid from '@/components/ui/ModuleStatsGrid';
import EmptyState from '@/components/ui/EmptyState';
import { mapResourceFromApi, applyResourceCounts } from './libraryUtils';

const TABS = [
  { id: 'browse', label: 'All resources', icon: BookOpen },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'recent', label: 'Recent', icon: Clock },
  { id: 'my-uploads', label: 'My uploads', icon: FolderOpen },
  { id: 'saved', label: 'Saved', icon: Bookmark },
];

function ViewModeToggle({ viewMode, setViewMode }) {
  return (
    <div className="platform-view-toggle platform-view-toggle--emerald shrink-0">
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
  );
}

function ResourceCardSkeleton({ list = false }) {
  if (list) {
    return (
      <div className="lib-resource-card-skeleton lib-resource-card-skeleton--list" aria-hidden>
        <div className="lib-resource-card-skeleton__block lib-resource-card-skeleton__block--hero" />
        <div className="lib-resource-card-skeleton__content">
          <div className="lib-resource-card-skeleton__line lib-resource-card-skeleton__line--title" />
          <div className="lib-resource-card-skeleton__line lib-resource-card-skeleton__line--md" />
        </div>
      </div>
    );
  }

  return (
    <div className="lib-resource-card-skeleton" aria-hidden>
      <div className="lib-resource-card-skeleton__hero" />
      <div className="lib-resource-card-skeleton__body">
        <div className="lib-resource-card-skeleton__line lib-resource-card-skeleton__line--title" />
        <div className="lib-resource-card-skeleton__author">
          <div className="lib-resource-card-skeleton__avatar" />
          <div className="lib-resource-card-skeleton__author-lines">
            <div className="lib-resource-card-skeleton__line lib-resource-card-skeleton__line--md" />
            <div className="lib-resource-card-skeleton__line lib-resource-card-skeleton__line--xs" />
          </div>
        </div>
        <div className="lib-resource-card-skeleton__actions">
          <div className="lib-resource-card-skeleton__btn lib-resource-card-skeleton__btn--primary" />
          <div className="lib-resource-card-skeleton__btn" />
        </div>
      </div>
    </div>
  );
}

function emptyStateCopy(activeTab, searchTerm) {
  const hasSearch = Boolean(searchTerm.trim());
  if (hasSearch) {
    return {
      title: 'No matching resources',
      description: 'Try a different search term, subject, or tag filter.',
    };
  }
  switch (activeTab) {
    case 'my-uploads':
      return {
        title: 'No uploads yet',
        description: 'Resources you upload will appear here for easy access and management.',
      };
    case 'saved':
      return {
        title: 'No saved resources',
        description: 'Bookmark resources from the library to find them quickly later.',
      };
    case 'trending':
      return {
        title: 'No trending resources',
        description: 'Popular study materials will show up here as the community grows.',
      };
    case 'recent':
      return {
        title: 'No recent resources',
        description: 'Newly uploaded materials will appear here soon.',
      };
    default:
      return {
        title: 'No resources yet',
        description: 'Be the first to upload study material for everyone.',
      };
  }
}

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState('browse');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [subject, setSubject] = useState('All');
  const [collegeId, setCollegeId] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [sort, setSort] = useState('recent');
  const [viewMode, setViewMode] = useState('grid');
  const [documents, setDocuments] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [subjects, setSubjects] = useState(['All']);
  const [colleges, setColleges] = useState([]);
  const [tags, setTags] = useState([]);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [previewDoc, setPreviewDoc] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState('');

  const patchResourceInState = useCallback((id, countPatch) => {
    const merge = (row) => (row?.id === id ? applyResourceCounts(row, countPatch) : row);
    setDocuments((prev) => prev.map(merge));
    setPreviewDoc((prev) => merge(prev));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const loadMeta = useCallback(async () => {
    try {
      const [subRes, tagRes, colRes, statsRes] = await Promise.all([
        resourceLibraryService.getSubjects(),
        resourceLibraryService.getTags(),
        resourceLibraryService.getLibraryColleges(),
        resourceLibraryService.getResourceStats(),
      ]);
      setSubjects(['All', ...(subRes.subjects || [])]);
      setTags(tagRes.tags || []);
      setColleges(colRes.colleges || []);
      setStats(statsRes);
    } catch {
      /* optional meta */
    }
  }, []);

  const fetchList = useCallback(
    async (pageNum = 1, append = false) => {
      setLoading(true);
      setError('');
      try {
        let data;
        const baseParams = {
          page: pageNum,
          limit: 20,
          search: debouncedSearch.trim() || undefined,
          subject: subject !== 'All' ? subject : undefined,
          tenant_id: collegeId || undefined,
          tags: tagFilter || undefined,
          sort: activeTab === 'trending' ? 'popular' : sort,
        };

        if (activeTab === 'trending') {
          data = await resourceLibraryService.getPopularResources(20);
        } else if (activeTab === 'recent') {
          data = await resourceLibraryService.getRecentResources(20);
        } else if (activeTab === 'my-uploads') {
          data = await resourceLibraryService.getUserResources();
        } else if (activeTab === 'saved') {
          data = await resourceLibraryService.getBookmarkedResources();
        } else {
          data = await resourceLibraryService.getResources(baseParams);
        }

        const list = (data.resources || []).map(mapResourceFromApi);
        setDocuments((prev) => (append ? [...prev, ...list] : list));
        const pg = data.pagination || {};
        const totalPages =
          pg.pages ?? (Math.ceil((pg.total || list.length) / (pg.limit || 20)) || 1);
        setHasMore(pageNum < totalPages);
        setPage(pageNum);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load resources');
        if (!append) setDocuments([]);
      } finally {
        setLoading(false);
      }
    },
    [activeTab, debouncedSearch, subject, collegeId, tagFilter, sort],
  );

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    setPage(1);
    void fetchList(1, false);
  }, [fetchList]);

  useEffect(() => {
    if (!documents.length) return;
    const syncBookmarks = async () => {
      const slice = documents.slice(0, 30);
      const results = await Promise.all(
        slice.map((d) =>
          bookmarkService.checkBookmark('resource', d.id).catch(() => ({ is_bookmarked: false })),
        ),
      );
      const set = new Set();
      slice.forEach((d, i) => {
        if (results[i]?.is_bookmarked) set.add(d.id);
      });
      setBookmarkedIds(set);
    };
    const t = setTimeout(syncBookmarks, 400);
    return () => clearTimeout(t);
  }, [documents]);

  const handleLike = async (doc) => {
    try {
      if (doc.is_liked) {
        const res = await resourceLibraryService.unlikeResource(doc.id);
        const count = res?.data?.likes_count ?? Math.max(0, doc.likes - 1);
        const patch = { is_liked: false, likes: count };
        setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, ...patch } : d)));
        setPreviewDoc((prev) => (prev?.id === doc.id ? { ...prev, ...patch } : prev));
      } else {
        const res = await resourceLibraryService.likeResource(doc.id);
        const count = res?.data?.likes_count ?? doc.likes + 1;
        const patch = { is_liked: true, likes: count };
        setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, ...patch } : d)));
        setPreviewDoc((prev) => (prev?.id === doc.id ? { ...prev, ...patch } : prev));
      }
    } catch {
      /* ignore */
    }
  };

  const handleBookmark = async (doc) => {
    try {
      if (bookmarkedIds.has(doc.id)) {
        const check = await bookmarkService.checkBookmark('resource', doc.id);
        if (check.bookmark_id) await bookmarkService.deleteBookmark(check.bookmark_id);
        setBookmarkedIds((prev) => {
          const n = new Set(prev);
          n.delete(doc.id);
          return n;
        });
      } else {
        await bookmarkService.createBookmark('resource', doc.id);
        setBookmarkedIds((prev) => new Set(prev).add(doc.id));
      }
    } catch {
      /* ignore */
    }
  };

  const handleDownload = async (doc) => {
    const prevDownloads = doc.downloads ?? doc.downloads_count ?? 0;
    patchResourceInState(doc.id, { downloads: prevDownloads + 1 });
    try {
      const res = await resourceLibraryService.downloadResource(doc.id);
      const serverDownloads =
        res.downloads_count != null ? Number(res.downloads_count) : prevDownloads + 1;
      patchResourceInState(doc.id, { downloads: serverDownloads });
      const href = doc.fileUrl || res.file_url;
      const a = document.createElement('a');
      a.href = href;
      a.download = res.filename || doc.title;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      patchResourceInState(doc.id, { downloads: prevDownloads });
      setError(err?.response?.data?.message || 'Download failed');
    }
  };

  const handlePreview = async (doc) => {
    const prevViews = doc.views ?? doc.views_count ?? 0;
    patchResourceInState(doc.id, { views: prevViews + 1 });
    try {
      const detail = await resourceLibraryService.getResource(doc.id);
      const mapped = mapResourceFromApi(detail);
      patchResourceInState(doc.id, {
        views: mapped.views ?? mapped.views_count ?? prevViews + 1,
      });
      setPreviewDoc(mapped);
    } catch {
      patchResourceInState(doc.id, { views: prevViews });
      setPreviewDoc(doc);
    }
  };

  const handleUpload = async ({ title, description, subject: sub, type, file, tags: t }) => {
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('file', file);
      formData.append('subject', sub);
      formData.append('tags', JSON.stringify(t));
      formData.append('type', type);
      formData.append('is_public', 'true');
      await resourceLibraryService.uploadResource(formData);
      setShowUpload(false);
      setActiveTab('my-uploads');
      void fetchList(1, false);
      void loadMeta();
    } catch (err) {
      setError(err?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const submitReport = async () => {
    if (!reportTarget || !reportReason.trim()) return;
    try {
      await resourceLibraryService.reportResource(reportTarget.id, reportReason.trim());
      setReportTarget(null);
      setReportReason('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not submit report');
    }
  };

  const emptyCopy = emptyStateCopy(activeTab, searchTerm);

  const statItems = stats
    ? [
        { label: 'Resources', value: stats.total_resources ?? 0, icon: BookOpen },
        { label: 'Downloads', value: stats.total_downloads ?? 0, icon: Download },
        { label: 'Views', value: stats.total_views ?? 0, icon: Eye },
        { label: 'Colleges', value: colleges.length, icon: Building2 },
      ]
    : [];

  return (
    <div className="platform-page">
      <div className="platform-page__container lib-page-stack">
        <PageHeader
          icon={BookOpen}
          badge="Global study hub"
          title="Library Central"
          description="PDFs and resources shared across all colleges."
          variant="emerald"
          action={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fetchList(1, false)}
                className="rounded-xl border border-white/30 bg-white/10 p-3 text-white backdrop-blur hover:bg-white/20"
                title="Refresh"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setShowUpload(true)}
                className="platform-hero__cta text-emerald-700 hover:bg-emerald-50"
              >
                <Upload className="h-5 w-5" />
                Upload
              </button>
            </div>
          }
        />
        {statItems.length > 0 ? (
          <ModuleStatsGrid className="lib-page__stats" items={statItems} theme="emerald" />
        ) : null}

        <div className="lib-feed-tabs">
          <ModuleFeedTabs
            shellClassName="lib-feed-tabs__shell"
            className="lib-feed-tabs__tabs"
            tabs={TABS.map((tab) => ({ key: tab.id, label: tab.label, icon: tab.icon }))}
            activeKey={activeTab}
            onChange={setActiveTab}
            ariaLabel="Library sections"
          />
        </div>

        <div className="lib-page__toolbar-wrap">
          {activeTab === 'browse' ? (
            <div className="platform-toolbar">
              <div className="lib-toolbar-row">
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search title, description, tags…"
                    className="platform-search"
                    aria-label="Search resources"
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
                <div className="lib-toolbar-row__filters lg:shrink-0">
                  <PlatformSelect
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="lib-toolbar-row__select"
                    aria-label="Filter by subject"
                  >
                    {subjects.map((s) => (
                      <option key={s} value={s}>
                        {s === 'All' ? 'All subjects' : s}
                      </option>
                    ))}
                  </PlatformSelect>
                  <PlatformSelect
                    value={collegeId}
                    onChange={(e) => setCollegeId(e.target.value)}
                    className="lib-toolbar-row__select"
                    aria-label="Filter by college"
                    placeholder="All colleges"
                  >
                    <option value="">All colleges</option>
                    {colleges.map((c) => (
                      <option key={c.tenant_id} value={c.tenant_id}>
                        {c.name}
                      </option>
                    ))}
                  </PlatformSelect>
                  <PlatformSelect
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="lib-toolbar-row__select"
                    aria-label="Sort resources"
                  >
                    <option value="recent">Newest</option>
                    <option value="popular">Most popular</option>
                    <option value="likes">Most liked</option>
                  </PlatformSelect>
                  <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
                </div>
              </div>
              {tags.length > 0 ? (
                <div className="lib-tag-filters">
                  <button
                    type="button"
                    onClick={() => setTagFilter('')}
                    className={[
                      'lib-tag-filter',
                      !tagFilter ? 'lib-tag-filter--active' : 'lib-tag-filter--idle',
                    ].join(' ')}
                  >
                    All tags
                  </button>
                  {tags.slice(0, 12).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTagFilter(tagFilter === t ? '' : t)}
                      className={[
                        'lib-tag-filter',
                        tagFilter === t ? 'lib-tag-filter--active' : 'lib-tag-filter--idle',
                      ].join(' ')}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="platform-toolbar">
              <div className="lib-toolbar-row lib-toolbar-row--view-only">
                <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
              </div>
            </div>
          )}
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

        {!loading && documents.length > 0 ? (
          <div className="lib-content-chrome">
            <p className="lib-content-chrome__count">
              {documents.length} resource{documents.length === 1 ? '' : 's'}
              {searchTerm.trim() && activeTab === 'browse' ? ` matching “${searchTerm.trim()}”` : ''}
            </p>
          </div>
        ) : null}

        <div className="lib-page__content">
          {loading && documents.length === 0 ? (
            <div className={viewMode === 'grid' ? 'lib-grid' : 'lib-list'}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <ResourceCardSkeleton key={i} list={viewMode === 'list'} />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <EmptyState
              className="w-full"
              icon={BookOpen}
              title={emptyCopy.title}
              description={emptyCopy.description}
            />
          ) : (
            <div className={viewMode === 'grid' ? 'lib-grid platform-stagger' : 'lib-list platform-stagger'}>
              {documents.map((doc) => (
                <ResourceCard
                  key={doc.id}
                  doc={doc}
                  viewMode={viewMode}
                  onPreview={handlePreview}
                  onDownload={handleDownload}
                  onBookmark={handleBookmark}
                  isBookmarked={bookmarkedIds.has(doc.id)}
                  isFeatured={activeTab === 'trending'}
                />
              ))}
            </div>
          )}

          {hasMore && activeTab === 'browse' ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => fetchList(page + 1, true)}
              className="lib-load-more"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Loading…
                </>
              ) : (
                'Load more'
              )}
            </button>
          ) : null}
        </div>
      </div>

      <ResourcePreviewModal
        doc={previewDoc}
        onClose={() => setPreviewDoc(null)}
        onDownload={handleDownload}
        onLike={handleLike}
        onBookmark={handleBookmark}
        onReport={setReportTarget}
        isBookmarked={previewDoc ? bookmarkedIds.has(previewDoc.id) : false}
      />

      <UploadResourceModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onSubmit={handleUpload}
        submitting={uploading}
        subjects={subjects}
        tagSuggestions={tags}
      />

      {reportTarget && (
        <div className="lib-report-modal" onClick={() => { setReportTarget(null); setReportReason(''); }}>
          <div className="lib-report-modal__dialog" onClick={(e) => e.stopPropagation()}>
            <header className="lib-report-modal__header">
              <h3 className="lib-report-modal__title">Report resource</h3>
              <p className="lib-report-modal__subtitle truncate">{reportTarget.title}</p>
            </header>
            <div className="lib-report-modal__body">
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                rows={3}
                className="lib-upload-modal__textarea"
                placeholder="Why are you reporting this file?"
              />
            </div>
            <footer className="lib-report-modal__footer">
              <button
                type="button"
                onClick={() => {
                  setReportTarget(null);
                  setReportReason('');
                }}
                className="lib-upload-modal__btn lib-upload-modal__btn--ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReport}
                className="lib-report-modal__submit"
              >
                Submit report
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
