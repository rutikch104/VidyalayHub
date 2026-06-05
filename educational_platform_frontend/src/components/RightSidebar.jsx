import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, Calendar, Users, Bell, Zap, BookOpen,
  Target, Sparkles, Loader2, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import userService from '@/services/userService';
import feedService from '@/services/feedService';
import eventsService from '@/services/eventsService';
import connectionService from '@/services/connectionService';
import { emitNotificationsChanged } from '@/services/notificationService';
import { resolveMediaUrl } from '@/services/postService';
import { normalizeSuggestionPerson } from '@/lib/homeProfileCardHelpers';
import HomeProfileCard from '@/components/home/HomeProfileCard';
import HomeUserSuggestionCard from '@/components/home/HomeUserSuggestionCard';
import NoticeBoardModal from '@/components/NoticeBoardModal';

/** Default cover when the user has not uploaded a profile banner */
const HOME_PROFILE_COVER_FALLBACK =
  'https://images.pexels.com/photos/373543/pexels-photo-373543.jpeg?auto=compress&cs=tinysrgb&w=800';

const HOME_PROFILE_AVATAR_FALLBACK =
  'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150';

function resolveAvatarSrc(url) {
  return resolveMediaUrl(url || '') || url || HOME_PROFILE_AVATAR_FALLBACK;
}

/* ─── formatters ────────────────────────────────────────────────── */
function formatEventRow(ev) {
  const raw = ev.date || ev.start_date || '';
  const d   = raw ? new Date(`${String(raw).slice(0, 10)}T12:00:00`) : null;
  const dateLabel = d && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—';
  const st = ev.start_time ? String(ev.start_time) : '';
  const timeLabel = st.length >= 5 ? st.slice(0, 5) : st || '—';
  return { dateLabel, timeLabel };
}

/* ─── Skeleton ──────────────────────────────────────────────────── */
function SectionSkeleton({ rows = 3 }) {
  return (
    <div className="animate-pulse space-y-2.5 py-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-11 rounded-xl bg-muted" />
      ))}
    </div>
  );
}

/* ─── Shared widget wrapper ─────────────────────────────────────── */
function Widget({ children, className = '' }) {
  return (
    <div className={`platform-rail-card p-5 ${className}`}>
      {children}
    </div>
  );
}

function WidgetHeader({ icon: Icon, gradient, title, actionLabel, onAction }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg shadow-xs ${gradient}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <h3 className="platform-rail-card__title">{title}</h3>
      </div>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 hover:text-brand-800"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/* ─── RightSidebar ──────────────────────────────────────────────── */
const RightSidebar = ({ onNavigate }) => {
  const { user } = useAuth();

  const [summary,           setSummary]           = useState({ posts_count: 0, connections_count: 0, likes_received: 0, location: null, cover_image_url: null });
  const [profileSnapshot,   setProfileSnapshot]   = useState(null);
  const [trendingLoading,   setTrendingLoading]   = useState(true);
  const [trendingHashtags,  setTrendingHashtags]  = useState([]);
  const [trendingSkills,    setTrendingSkills]    = useState([]);
  const [noticesLoading,    setNoticesLoading]    = useState(true);
  const [notices,           setNotices]           = useState([]);
  const [eventsLoading,     setEventsLoading]     = useState(true);
  const [upcomingEvents,    setUpcomingEvents]    = useState([]);
  const [suggestionsLoading,setSuggestionsLoading]= useState(true);
  const [suggestions,       setSuggestions]       = useState([]);
  const [connectBusyId,     setConnectBusyId]     = useState(null);
  const [connectedIds,      setConnectedIds]      = useState(new Set());
  const [noticeModalOpen,   setNoticeModalOpen]   = useState(false);
  const [noticeFocusId,    setNoticeFocusId]     = useState(null);

  const loadAll = useCallback(async () => {
    if (!user) {
      // Reset to empty/idle so previous user's data doesn't bleed through
      // when switching accounts or logging out.
      [setTrendingLoading, setNoticesLoading, setEventsLoading, setSuggestionsLoading]
        .forEach((fn) => fn(false));
      setSummary({ posts_count: 0, connections_count: 0, likes_received: 0, location: null, cover_image_url: null });
      setProfileSnapshot(null);
      setTrendingHashtags([]);
      setTrendingSkills([]);
      setNotices([]);
      setUpcomingEvents([]);
      setSuggestions([]);
      setConnectedIds(new Set());
      return;
    }
    [setTrendingLoading, setNoticesLoading, setEventsLoading, setSuggestionsLoading]
      .forEach((fn) => fn(true));

    const results = await Promise.allSettled([
      userService.getMeSidebarSummary(),
      userService.getCurrentUserProfile(),
      feedService.getTrendingTopicsDetailed(),
      feedService.getSidebarNotices(5),
      eventsService.getEvents({ tab: 'Upcoming', limit: 3, page: 1 }),
      connectionService.getNetworkSuggestions({ limit: 5, page: 1 }),
    ]);

    if (results[0].status === 'fulfilled') setSummary(results[0].value);
    else setSummary({ posts_count: 0, connections_count: 0, likes_received: 0, location: null, cover_image_url: null });

    if (results[1].status === 'fulfilled') setProfileSnapshot(results[1].value);
    else setProfileSnapshot(null);

    if (results[2].status === 'fulfilled') {
      const t = results[2].value;
      setTrendingHashtags(t.hashtags.slice(0, 5));
      setTrendingSkills(t.skills.slice(0, 3));
    } else { setTrendingHashtags([]); setTrendingSkills([]); }
    setTrendingLoading(false);

    setNotices(results[3].status === 'fulfilled' ? results[3].value : []);
    setNoticesLoading(false);

    setUpcomingEvents(results[4].status === 'fulfilled' ? (results[4].value.events || []) : []);
    setEventsLoading(false);

    setSuggestions(results[5].status === 'fulfilled' ? (results[5].value.users || []) : []);
    setSuggestionsLoading(false);
    // Reset any optimistic "Sent" markers from a previous session — server
    // is the source of truth and would already filter out already-connected
    // suggestions, so any stale set entries are misleading.
    setConnectedIds(new Set());
    // Depend on user.id only — the user object reference can change between
    // AuthContext renders even when identity hasn't, which would re-trigger
    // the chained useEffect and fire all six requests redundantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const profileCoverSrc = useMemo(() => {
    const raw = user?.cover_image_url || profileSnapshot?.cover_image_url || summary.cover_image_url;
    if (raw) return resolveMediaUrl(raw) || raw;
    return HOME_PROFILE_COVER_FALLBACK;
  }, [user?.cover_image_url, profileSnapshot?.cover_image_url, summary.cover_image_url]);

  const suggestionCards = useMemo(
    () => suggestions.map((person) => normalizeSuggestionPerson(person, resolveAvatarSrc)),
    [suggestions],
  );

  const handleConnect = async (targetId) => {
    setConnectBusyId(targetId);
    try {
      await connectionService.sendConnectionRequest(targetId);
      setConnectedIds((prev) => new Set(prev).add(targetId));
      emitNotificationsChanged();
    } catch (e) { console.error(e); }
    finally { setConnectBusyId(null); }
  };

  return (
    <div className="w-full space-y-5">
      <NoticeBoardModal
        open={noticeModalOpen}
        onClose={() => {
          setNoticeModalOpen(false);
          setNoticeFocusId(null);
        }}
        sidebarPreview={notices}
        initialNoticeId={noticeFocusId}
      />

      <HomeProfileCard
        user={user}
        profile={profileSnapshot}
        summary={summary}
        coverSrc={profileCoverSrc}
        avatarSrc={resolveAvatarSrc(user?.avatar_url || profileSnapshot?.avatar_url)}
        onViewProfile={() => onNavigate?.('profile')}
        onSettings={() => onNavigate?.('settings')}
      />

      {/* ── Trending ── */}
      <Widget>
        <WidgetHeader
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-amber-500 to-rose-500"
          title="Trending"
          actionLabel="Feed"
          onAction={() => onNavigate?.('home')}
        />
        {trendingLoading ? (
          <div className="flex items-center justify-center py-5">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : trendingHashtags.length === 0 && trendingSkills.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No trending topics yet — post with hashtags to seed trends.
          </p>
        ) : (
          <div className="space-y-1">
            {trendingHashtags.map((h) => (
              <button
                key={h.tag}
                type="button"
                onClick={() => onNavigate?.('home')}
                className="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-primary/[0.07]"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">#{h.tag}</p>
                  <p className="text-[11px] text-muted-foreground">score {h.count.toFixed(1)}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
            {trendingSkills.map((s) => (
              <button
                key={s.skill}
                type="button"
                onClick={() => onNavigate?.('jobs')}
                className="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-emerald-50/80"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{s.skill}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {s.count} job mention{s.count === 1 ? '' : 's'}
                  </p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
        )}
      </Widget>

      {/* ── Notice board ── */}
      <Widget>
        <WidgetHeader
          icon={Bell}
          gradient="bg-gradient-to-br from-orange-500 to-amber-500"
          title="Notice board"
          actionLabel="View all"
          onAction={() => {
            setNoticeFocusId(null);
            setNoticeModalOpen(true);
          }}
        />
        {noticesLoading ? (
          <SectionSkeleton rows={2} />
        ) : notices.length === 0 ? (
          <button
            type="button"
            onClick={() => setNoticeModalOpen(true)}
            className="w-full rounded-xl border border-dashed border-border bg-muted/30 py-6 text-center text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-muted/50"
          >
            No notices right now — tap to open the notice center
          </button>
        ) : (
          <div className="space-y-3">
            {notices.map((n) => (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    setNoticeFocusId(n.id);
                    setNoticeModalOpen(true);
                  }
                }}
                onClick={() => {
                  setNoticeFocusId(n.id);
                  setNoticeModalOpen(true);
                }}
                className="cursor-pointer rounded-xl border border-orange-200/70 bg-gradient-to-br from-orange-50/90 to-amber-50/50 p-3.5 shadow-xs transition-all hover:border-orange-300 hover:shadow-soft"
              >
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-700">
                  {n.source === 'college' ? (n.college_name || 'College') : (n.community_name || 'Community')}
                </p>
                <h4 className="mb-1 text-sm font-semibold text-foreground">{n.title}</h4>
                <p className="mb-2 line-clamp-3 text-xs leading-relaxed text-foreground/85">{n.body || '—'}</p>
                <p className="mb-2 text-[11px] text-muted-foreground">By {n.author_name}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold text-primary">Read full notice →</span>
                  {n.source === 'community' && n.community_name ? (
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        sessionStorage.setItem('communities_search_prefill', n.community_name);
                        onNavigate?.('communities');
                      }}
                      className="rounded-lg bg-orange-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-orange-700"
                    >
                      Community
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Widget>

      {/* ── Upcoming events ── */}
      <Widget>
        <WidgetHeader
          icon={Calendar}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-500"
          title="Upcoming Events"
          actionLabel="See all"
          onAction={() => onNavigate?.('events')}
        />
        {eventsLoading ? (
          <SectionSkeleton rows={3} />
        ) : upcomingEvents.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No upcoming events. Check the Events page.
          </p>
        ) : (
          <div className="space-y-1">
            {upcomingEvents.map((ev) => {
              const { dateLabel, timeLabel } = formatEventRow(ev);
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => onNavigate?.('events')}
                  className="group w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-emerald-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="line-clamp-2 text-sm font-medium text-foreground group-hover:text-emerald-700">
                      {ev.title}
                    </h4>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] font-semibold text-muted-foreground">{dateLabel}</p>
                      <p className="text-[11px] text-muted-foreground">{timeLabel}</p>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{ev.current_participants ?? 0} interested</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Widget>

      {/* ── Who to follow ── */}
      <Widget>
        <WidgetHeader
          icon={Users}
          gradient="bg-gradient-to-br from-primary to-accent"
          title="Who to Follow"
          actionLabel="Network"
          onAction={() => onNavigate?.('network')}
        />
        {suggestionsLoading ? (
          <SectionSkeleton rows={3} />
        ) : suggestions.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            You&apos;re well connected! Check back later.
          </p>
        ) : (
          <div className="space-y-0.5">
            {suggestionCards.map((person) => (
              <HomeUserSuggestionCard
                key={person.id}
                person={person}
                connectBusy={connectBusyId === person.id}
                connected={connectedIds.has(person.id)}
                onConnect={handleConnect}
              />
            ))}
          </div>
        )}
      </Widget>

      {/* ── Quick actions ── */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 shadow-elevated ring-1 ring-white/10"
        style={{ background: 'linear-gradient(145deg, hsl(213 94% 46%) 0%, hsl(250 75% 56%) 50%, hsl(213 94% 36%) 100%)' }}
      >
        <div className="pointer-events-none absolute -right-8 top-0 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        <div className="mb-3.5 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 shadow-inner ring-1 ring-white/20">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold tracking-tight text-white">Quick actions</h3>
        </div>
        <div className="relative space-y-1.5">
          {[
            { icon: BookOpen, label: 'Browse Library',      page: 'library' },
            { icon: Target,   label: 'Find Jobs',           page: 'jobs' },
            { icon: Sparkles, label: 'AI Interview Prep',   page: 'ai-interview' },
          ].map(({ icon: Icon, label, page }) => (
            <button
              key={page}
              type="button"
              onClick={() => onNavigate?.(page)}
              className="flex w-full items-center gap-2.5 rounded-xl bg-white/14 px-3 py-2.5 text-left text-sm font-medium text-white ring-1 ring-white/10 transition-all hover:bg-white/24 hover:ring-white/20 active:scale-[0.98]"
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;
