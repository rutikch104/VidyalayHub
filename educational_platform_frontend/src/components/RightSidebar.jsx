import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, Calendar, Users, Bell, Zap, BookOpen,
  Target, Sparkles, Loader2, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import feedService from '@/services/feedService';
import eventsService from '@/services/eventsService';
import connectionService from '@/services/connectionService';
import { emitNotificationsChanged } from '@/services/notificationService';
import { resolveMediaUrl } from '@/services/postService';
import { normalizeSuggestionPerson } from '@/lib/homeProfileCardHelpers';
import HomeUserSuggestionCard from '@/components/home/HomeUserSuggestionCard';
import UpcomingEventsWidget from '@/components/home/UpcomingEventsWidget';
import TrendingWidget from '@/components/home/TrendingWidget';
import NoticeBoardWidget from '@/components/home/NoticeBoardWidget';
import NoticeBoardModal from '@/components/NoticeBoardModal';
import { NOTIF_NAV_KEYS, consumeStringKey } from '@/lib/notificationNavigation';
import { UPCOMING_EVENTS_LIMIT } from '@/lib/upcomingEventsWidgetUtils';
import { NOTICE_BOARD_LIMIT } from '@/lib/noticeBoardWidgetUtils';
import { TRENDING_HASHTAG_FETCH_LIMIT } from '@/lib/trendingWidgetUtils';

const HOME_PROFILE_AVATAR_FALLBACK =
  'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150';

function resolveAvatarSrc(url) {
  return resolveMediaUrl(url || '') || url || HOME_PROFILE_AVATAR_FALLBACK;
}

/* ─── formatters ────────────────────────────────────────────────── */

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

  const [trendingLoading,   setTrendingLoading]   = useState(true);
  const [trendingHashtags,  setTrendingHashtags]  = useState([]);
  const [trendingSkills,    setTrendingSkills]    = useState([]);
  const [noticesLoading,    setNoticesLoading]    = useState(true);
  const [notices,           setNotices]           = useState([]);
  const [eventsLoading,     setEventsLoading]     = useState(true);
  const [upcomingEvents,    setUpcomingEvents]    = useState([]);
  const [upcomingEventsTotal, setUpcomingEventsTotal] = useState(0);
  const [suggestionsLoading,setSuggestionsLoading]= useState(true);
  const [suggestions,       setSuggestions]       = useState([]);
  const [connectBusyId,     setConnectBusyId]     = useState(null);
  const [connectedIds,      setConnectedIds]      = useState(new Set());
  const [noticeModalOpen,   setNoticeModalOpen]   = useState(false);
  const [noticeFocusId,    setNoticeFocusId]     = useState(null);

  const loadAll = useCallback(async () => {
    if (!user) {
      [setTrendingLoading, setNoticesLoading, setEventsLoading, setSuggestionsLoading]
        .forEach((fn) => fn(false));
      return;
    }
    [setTrendingLoading, setNoticesLoading, setEventsLoading, setSuggestionsLoading]
      .forEach((fn) => fn(true));

    const results = await Promise.allSettled([
      feedService.getTrendingTopicsDetailed(),
      feedService.getSidebarNotices(NOTICE_BOARD_LIMIT),
      eventsService.getEvents({ tab: 'Upcoming', limit: UPCOMING_EVENTS_LIMIT, page: 1 }),
      connectionService.getNetworkSuggestions({ limit: 5, page: 1 }),
    ]);

    if (results[0].status === 'fulfilled') {
      const t = results[0].value;
      setTrendingHashtags(t.hashtags.slice(0, TRENDING_HASHTAG_FETCH_LIMIT));
      setTrendingSkills(t.skills.slice(0, 3));
    } else { setTrendingHashtags([]); setTrendingSkills([]); }
    setTrendingLoading(false);

    setNotices(results[1].status === 'fulfilled' ? results[1].value : []);
    setNoticesLoading(false);

    setUpcomingEvents(results[2].status === 'fulfilled' ? (results[2].value.events || []) : []);
    setUpcomingEventsTotal(
      results[2].status === 'fulfilled'
        ? (results[2].value.total ?? results[2].value.events?.length ?? 0)
        : 0,
    );
    setEventsLoading(false);

    setSuggestions(results[3].status === 'fulfilled' ? (results[3].value.users || []) : []);
    setSuggestionsLoading(false);
  }, [user]);

  useEffect(() => { void loadAll(); }, [loadAll]);

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

  useEffect(() => {
    const noticeId = consumeStringKey(NOTIF_NAV_KEYS.NOTICE_ID);
    if (!noticeId) return;
    setNoticeFocusId(noticeId);
    setNoticeModalOpen(true);
  }, []);

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
        <NoticeBoardWidget
          notices={notices}
          loading={noticesLoading}
          onOpenNotice={(notice) => {
            setNoticeFocusId(notice.id);
            setNoticeModalOpen(true);
          }}
          onViewAll={() => {
            setNoticeFocusId(null);
            setNoticeModalOpen(true);
          }}
          onCommunityNavigate={(notice) => {
            if (notice.community_name) {
              sessionStorage.setItem('communities_search_prefill', notice.community_name);
            }
            onNavigate?.('communities');
          }}
        />
      </Widget>

      {/* ── Trending ── */}
      <Widget>
        <WidgetHeader
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-amber-500 to-rose-500"
          title="Trending"
          actionLabel="Feed"
          onAction={() => onNavigate?.('home')}
        />
        <TrendingWidget
          hashtags={trendingHashtags}
          skills={trendingSkills}
          loading={trendingLoading}
          onHashtagClick={() => onNavigate?.('home')}
          onSkillClick={() => onNavigate?.('jobs')}
          onViewAll={() => onNavigate?.('home')}
        />
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
        <UpcomingEventsWidget
          events={upcomingEvents}
          loading={eventsLoading}
          total={upcomingEventsTotal}
          onNavigate={onNavigate}
        />
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
          <div className="home-user-suggestions">
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
