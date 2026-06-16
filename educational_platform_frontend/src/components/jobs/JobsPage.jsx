// @ts-nocheck
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Briefcase,
  Plus,
  Loader2,
  Sparkles,
  FileText,
  Send,
  Inbox,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import jobService from '@/services/jobService';
import bookmarkService from '@/services/bookmarkService';
import { emitNotificationsChanged } from '@/services/notificationService';
import JobCard from './JobCard';
import JobSkeleton from './JobSkeleton';
import JobsFilterBar from './JobsFilterBar';
import CreateJobModal from './CreateJobModal';
import ApplyJobModal from './ApplyJobModal';
import JobDetailModal from './JobDetailModal';
import PageHeader from '@/components/ui/PageHeader';
import ModuleStatsGrid from '@/components/ui/ModuleStatsGrid';
import EmptyState from '@/components/ui/EmptyState';
import { canPostJobs, hasApplied, isJobOwner } from './jobUtils';

export default function JobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [location, setLocation] = useState('all');
  const [jobType, setJobType] = useState('all');
  const [category, setCategory] = useState('all');
  const [experience, setExperience] = useState('all');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [sort, setSort] = useState('latest');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [stats, setStats] = useState(null);
  const [popularSkills, setPopularSkills] = useState([]);
  const [applications, setApplications] = useState([]);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [applyJob, setApplyJob] = useState(null);
  const [detailJob, setDetailJob] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const fetchSeq = useRef(0);
  const poster = canPostJobs(user);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    const p = sessionStorage.getItem('jobs_search_prefill');
    if (!p) return;
    sessionStorage.removeItem('jobs_search_prefill');
    setSearchTerm(p);
    setDebouncedSearch(p.trim());
  }, []);

  const buildParams = useCallback(
    (pageNum) => {
      const params = { page: pageNum, limit: 15, sort };
      if (debouncedSearch) params.search = debouncedSearch;
      if (location !== 'all') params.location = location;
      if (jobType !== 'all') params.job_type = jobType === 'internship' ? 'intern' : jobType;
      if (category !== 'all') params.category = category;
      if (experience !== 'all') params.experience_level = experience;
      if (remoteOnly) params.is_remote = true;
      if (selectedSkill) params.skills = selectedSkill;
      return params;
    },
    [debouncedSearch, location, jobType, category, experience, remoteOnly, sort, selectedSkill],
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (debouncedSearch) n += 1;
    if (category !== 'all') n += 1;
    if (jobType !== 'all') n += 1;
    if (location !== 'all') n += 1;
    if (experience !== 'all') n += 1;
    if (remoteOnly) n += 1;
    if (sort !== 'latest') n += 1;
    if (selectedSkill) n += 1;
    return n;
  }, [debouncedSearch, category, jobType, location, experience, remoteOnly, sort, selectedSkill]);

  const clearAllFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setCategory('all');
    setJobType('all');
    setLocation('all');
    setExperience('all');
    setRemoteOnly(false);
    setSort('latest');
    setSelectedSkill('');
  };

  const fetchJobs = useCallback(
    async (pageNum = 1, append = false) => {
      const seq = ++fetchSeq.current;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError('');
      try {
        const res = await jobService.getJobs(buildParams(pageNum));
        if (seq !== fetchSeq.current) return;
        const list = res.jobs || [];
        let merged = list;
        setJobs((prev) => {
          merged = append ? [...prev, ...list] : list;
          return merged;
        });
        setHasMore((res.page || pageNum) < (res.totalPages || 1));
        setPage(pageNum);
        syncBookmarks(merged, seq);
      } catch (err) {
        if (seq !== fetchSeq.current) return;
        setError(err?.response?.data?.message || 'Failed to load jobs');
      } finally {
        if (seq === fetchSeq.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [buildParams],
  );

  const syncBookmarks = async (list, seq) => {
    try {
      const bm = await bookmarkService.getUserBookmarksByType('job', { limit: 200, page: 1 });
      if (seq !== fetchSeq.current) return;
      const ids = new Set();
      const idSet = new Set(list.map((j) => j.id));
      (bm.bookmarks || []).forEach((b) => {
        if (b.type_id && idSet.has(b.type_id)) ids.add(b.type_id);
      });
      setBookmarkedIds(ids);
    } catch {
      /* optional */
    }
  };

  const loadMeta = useCallback(async () => {
    try {
      const [skillsRes, statsRes, appsRes] = await Promise.all([
        jobService.getPopularJobSkills(),
        jobService.getJobStats(),
        jobService.getUserApplications({ limit: 100, page: 1 }),
      ]);
      setPopularSkills(skillsRes.skills || []);
      setStats(statsRes);
      setApplications(appsRes.applications || []);
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    setPage(1);
    void fetchJobs(1, false);
  }, [fetchJobs]);

  const openDetail = async (job) => {
    // Optimistically increment view count immediately in the list and modal
    const optimistic = { ...job, views_count: (job.views_count ?? 0) + 1 };
    setJobs((prev) => prev.map((j) => (j.id === job.id ? optimistic : j)));
    setDetailJob(optimistic);
    setDetailLoading(true);
    try {
      const full = await jobService.getJob(job.id);
      setDetailJob(full);
      // Sync real server data back into the list (accurate view count)
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, ...full } : j)));
    } catch {
      setDetailJob(job);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleBookmark = async (jobId) => {
    try {
      if (bookmarkedIds.has(jobId)) {
        const check = await bookmarkService.checkBookmark('job', jobId);
        if (check.bookmark_id) await bookmarkService.deleteBookmark(check.bookmark_id);
        setBookmarkedIds((prev) => {
          const n = new Set(prev);
          n.delete(jobId);
          return n;
        });
      } else {
        await bookmarkService.createBookmark('job', jobId);
        setBookmarkedIds((prev) => new Set(prev).add(jobId));
      }
    } catch {
      /* ignore */
    }
  };

  const handleCreate = async (data) => {
    await jobService.createJob(data);
    emitNotificationsChanged();
    await Promise.all([fetchJobs(1, false), loadMeta()]);
  };

  const handleApply = async (jobId, payload) => {
    await jobService.applyForJob(jobId, payload);
    emitNotificationsChanged();
    const appsRes = await jobService.getUserApplications({ limit: 100, page: 1 });
    setApplications(appsRes.applications || []);
    void fetchJobs(1, false);
  };

  const statItems = stats
    ? [
        { label: 'Active jobs', value: stats.active_jobs ?? 0, icon: Briefcase },
        { label: 'My applications', value: stats.total_applications ?? 0, icon: Send },
        { label: 'Posted', value: stats.posted_jobs ?? 0, icon: FileText },
        { label: 'Applications received', value: stats.applications_received ?? 0, icon: Inbox },
      ]
    : [];

  return (
    <div className="platform-page">
      <div className="platform-page__container">
        <PageHeader
          icon={Sparkles}
          badge="Careers & internships"
          title="Job Opportunities"
          description="Discover roles posted by teachers and alumni across colleges. Apply in-app or via company links."
          variant="sky"
          action={
            poster ? (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="platform-hero__cta text-sky-700 hover:bg-sky-50"
              >
                <Plus className="h-4 w-4" />
                Post job
              </button>
            ) : null
          }
        />

        {statItems.length > 0 && (
          <ModuleStatsGrid className="mt-6" items={statItems} theme="sky" />
        )}

        <div className="mt-8">
          <JobsFilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            category={category}
            onCategoryChange={setCategory}
            jobType={jobType}
            onJobTypeChange={setJobType}
            location={location}
            onLocationChange={setLocation}
            experience={experience}
            onExperienceChange={setExperience}
            sort={sort}
            onSortChange={setSort}
            remoteOnly={remoteOnly}
            onRemoteOnlyChange={setRemoteOnly}
            popularSkills={popularSkills}
            selectedSkill={selectedSkill}
            onSkillClick={(skill) => {
              setSelectedSkill((prev) => (prev === skill ? '' : skill));
            }}
            onClearAll={clearAllFilters}
            activeFilterCount={activeFilterCount}
            resultsCount={loading ? undefined : jobs.length}
          />
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-4 platform-stagger">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <JobSkeleton key={i} />)
          ) : jobs.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No jobs match your search"
              description="Try adjusting filters or explore trending skills above."
              action={
                activeFilterCount > 0 ? (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="platform-hero__cta inline-flex text-sky-700 hover:bg-sky-50"
                  >
                    Clear all filters
                  </button>
                ) : null
              }
            />
          ) : (
            jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isBookmarked={bookmarkedIds.has(job.id)}
                isApplied={hasApplied(applications, job.id)}
                isOwner={isJobOwner(user?.id, job)}
                onOpen={openDetail}
                onBookmark={handleBookmark}
                onApply={setApplyJob}
              />
            ))
          )}
        </div>

        {!loading && hasMore && (
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => fetchJobs(page + 1, true)}
            className="jobs-load-more mt-6"
          >
            {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
            Load more opportunities
          </button>
        )}

        <CreateJobModal open={showCreate} onClose={() => setShowCreate(false)} onSubmit={handleCreate} />
        <ApplyJobModal
          job={applyJob}
          onClose={() => setApplyJob(null)}
          onSubmit={(payload) => handleApply(applyJob.id, payload)}
        />
        <JobDetailModal
          job={detailJob}
          loading={detailLoading}
          onClose={() => setDetailJob(null)}
          onApply={setApplyJob}
          isApplied={detailJob && hasApplied(applications, detailJob.id)}
          isOwner={detailJob && isJobOwner(user?.id, detailJob)}
        />
      </div>
    </div>
  );
}
