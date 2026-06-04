// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, Search, Plus, Loader2, Sparkles, Trash2, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import eventsService from '@/services/eventsService';
import bookmarkService from '@/services/bookmarkService';
import EventCard from './EventCard';
import EventSkeleton from './EventSkeleton';
import CreateEventModal from './CreateEventModal';
import EventDetailModal from './EventDetailModal';
import PageHeader from '@/components/ui/PageHeader';
import ModuleFeedTabs from '@/components/ui/ModuleFeedTabs';
import EmptyState from '@/components/ui/EmptyState';
import { EVENT_TABS, EVENT_CATEGORIES, isOrganizer } from './eventUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function EventsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [statusByEvent, setStatusByEvent] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [detailEvent, setDetailEvent] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const fetchSeq = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    const p = sessionStorage.getItem('events_search_prefill');
    if (!p) return;
    sessionStorage.removeItem('events_search_prefill');
    setSearchTerm(p);
    setDebouncedSearch(p.trim());
  }, []);

  const loadStatuses = useCallback(async () => {
    try {
      const reg = await eventsService.getUserRegisteredEvents({ limit: 200 });
      const map = {};
      (reg.events || []).forEach((e) => {
        if (e.participant_status) map[e.id] = e.participant_status;
        else map[e.id] = 'going';
      });
      setStatusByEvent(map);
    } catch {
      setStatusByEvent({});
    }
  }, []);

  const syncBookmarks = async (list, seq) => {
    try {
      const bm = await bookmarkService.getUserBookmarksByType('event', { limit: 200 });
      if (seq !== fetchSeq.current) return;
      const ids = new Set();
      const idSet = new Set(list.map((e) => e.id));
      (bm.bookmarks || []).forEach((b) => {
        if (b.type_id && idSet.has(b.type_id)) ids.add(String(b.type_id));
      });
      setBookmarkedIds(ids);
    } catch {
      /* optional */
    }
  };

  const fetchEvents = useCallback(
    async (pageNum = 1, append = false) => {
      const seq = ++fetchSeq.current;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError('');
      try {
        const res = await eventsService.getEvents({
          tab: activeTab,
          q: debouncedSearch || undefined,
          category: category !== 'all' ? category : undefined,
          is_online: onlineOnly ? true : undefined,
          page: pageNum,
          limit: 12,
        });
        if (seq !== fetchSeq.current) return;
        const list = res.events || [];
        let merged = list;
        setEvents((prev) => {
          merged = append ? [...prev, ...list] : list;
          return merged;
        });
        const pag = res.pagination || {};
        setHasMore((pag.page || pageNum) < (pag.pages || 1));
        setPage(pageNum);
        void syncBookmarks(merged, seq);
      } catch (err) {
        if (seq !== fetchSeq.current) return;
        setError(err?.response?.data?.message || err?.message || 'Failed to load events');
      } finally {
        if (seq === fetchSeq.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [activeTab, debouncedSearch, category, onlineOnly],
  );

  useEffect(() => {
    void loadStatuses();
  }, [loadStatuses]);

  useEffect(() => {
    setPage(1);
    void fetchEvents(1, false);
  }, [fetchEvents]);

  const openDetail = async (ev) => {
    setDetailEvent(ev);
    setDetailLoading(true);
    try {
      const data = await eventsService.getEventById(ev.id);
      const full = data.event || data;
      setDetailEvent(full);
      if (full.participant_status) {
        setStatusByEvent((prev) => ({ ...prev, [full.id]: full.participant_status }));
      }
    } catch {
      setDetailEvent(ev);
    } finally {
      setDetailLoading(false);
    }
  };

  const setRegistration = async (ev, status) => {
    await eventsService.registerForEvent(ev.id, status);
    setStatusByEvent((prev) => ({ ...prev, [ev.id]: status }));
    void fetchEvents(1, false);
    if (detailEvent?.id === ev.id) {
      const data = await eventsService.getEventById(ev.id);
      setDetailEvent(data.event || data);
    }
  };

  const handleInterested = async (ev) => {
    const next = statusByEvent[ev.id] === 'interested' ? 'not going' : 'interested';
    if (next === 'not going') {
      await eventsService.cancelEventRegistration(ev.id);
      setStatusByEvent((prev) => {
        const n = { ...prev };
        delete n[ev.id];
        return n;
      });
    } else {
      await setRegistration(ev, 'interested');
    }
    void loadStatuses();
  };

  const handleGoing = async (ev) => {
    const next = statusByEvent[ev.id] === 'going' ? 'not going' : 'going';
    if (next === 'not going') {
      await eventsService.cancelEventRegistration(ev.id);
      setStatusByEvent((prev) => {
        const n = { ...prev };
        delete n[ev.id];
        return n;
      });
    } else {
      await setRegistration(ev, 'going');
    }
    void loadStatuses();
  };

  const handleBookmark = async (eventId) => {
    const sid = String(eventId);
    try {
      if (bookmarkedIds.has(sid)) {
        const check = await bookmarkService.checkBookmark('event', eventId);
        if (check.bookmark_id) await bookmarkService.deleteBookmark(check.bookmark_id);
        setBookmarkedIds((prev) => { const n = new Set(prev); n.delete(sid); return n; });
      } else {
        await bookmarkService.createBookmark('event', eventId);
        setBookmarkedIds((prev) => new Set(prev).add(sid));
      }
    } catch {
      /* ignore */
    }
  };

  const handleDelete = (ev) => {
    setDeleteTarget(ev);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await eventsService.deleteEvent(deleteTarget.id);
      setDeleteTarget(null);
      void fetchEvents(1, false);
      setDetailEvent(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleCreate = async (data) => {
    await eventsService.createEvent(data);
    void fetchEvents(1, false);
  };

  const feedTabs = EVENT_TABS.map((tab) => ({
    key: tab.id,
    label: tab.label,
  }));

  return (
    <div className="platform-page">
      <div className="platform-page__container events-page-stack">
        <PageHeader
          icon={Sparkles}
          badge="Campus & global events"
          title="Events"
          description="Private events for your college, or public events open to students everywhere."
          variant="amber"
          action={
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="platform-hero__cta text-amber-800 hover:bg-amber-50"
            >
              <Plus className="h-4 w-4" />
              Create event
            </button>
          }
        />

        <div className="events-feed-tabs">
          <ModuleFeedTabs
            shellClassName="events-feed-tabs__shell"
            className="events-feed-tabs__tabs"
            tabs={feedTabs}
            activeKey={activeTab}
            onChange={setActiveTab}
            ariaLabel="Event time filters"
          />
        </div>

        <div className="platform-toolbar">
          <div className="events-toolbar-row">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60"
                aria-hidden
              />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search events…"
                className="platform-search"
                aria-label="Search events"
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
          </div>
          <div className="events-toolbar-filters">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="events-toolbar-filters__select"
              aria-label="Filter by category"
            >
              <option value="all">All categories</option>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <label className="events-toolbar-filters__online">
              <input
                type="checkbox"
                checked={onlineOnly}
                onChange={(e) => setOnlineOnly(e.target.checked)}
                className="rounded border-border text-amber-600 focus:ring-amber-500"
              />
              Online only
            </label>
          </div>
        </div>

        {error ? (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/[0.06] px-4 py-3 text-sm text-destructive">
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

        {!loading && events.length > 0 ? (
          <div className="events-content-chrome">
            <p className="events-content-chrome__count">
              {events.length} event{events.length === 1 ? '' : 's'}
              {debouncedSearch ? ` matching “${debouncedSearch}”` : ''}
            </p>
          </div>
        ) : null}

        <div className="events-grid platform-stagger">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <EventSkeleton key={i} />)
            : events.length === 0
              ? (
                <EmptyState
                  className="col-span-full"
                  icon={Calendar}
                  title="No events found"
                  description="Try another tab, adjust filters, or create the first event."
                  action={
                    <button
                      type="button"
                      onClick={() => setShowCreate(true)}
                      className="platform-hero__cta inline-flex items-center gap-2 text-amber-800 hover:bg-amber-50"
                    >
                      <Plus className="h-4 w-4" />
                      Create event
                    </button>
                  }
                />
              )
              : events.map((ev) => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  isBookmarked={bookmarkedIds.has(String(ev.id))}
                  participantStatus={statusByEvent[ev.id]}
                  isOrganizer={isOrganizer(user?.id, ev)}
                  onOpen={openDetail}
                  onBookmark={handleBookmark}
                  onInterested={handleInterested}
                  onGoing={handleGoing}
                  onDelete={handleDelete}
                />
              ))}
        </div>

        {!loading && hasMore ? (
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => fetchEvents(page + 1, true)}
            className="events-load-more"
          >
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        ) : null}

        <CreateEventModal open={showCreate} onClose={() => setShowCreate(false)} onSubmit={handleCreate} />
        <EventDetailModal
          event={detailEvent}
          loading={detailLoading}
          onClose={() => setDetailEvent(null)}
          participantStatus={detailEvent ? statusByEvent[detailEvent.id] : null}
          isOrganizer={detailEvent && isOrganizer(user?.id, detailEvent)}
          onInterested={handleInterested}
          onGoing={handleGoing}
        />

        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete event?</AlertDialogTitle>
              <AlertDialogDescription>
                <strong className="text-foreground">{deleteTarget?.title}</strong>
                {' '}will be permanently removed. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleting}
                onClick={(e) => { e.preventDefault(); void confirmDelete(); }}
                className="inline-flex items-center gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                <Trash2 className="h-4 w-4" />
                Delete event
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
