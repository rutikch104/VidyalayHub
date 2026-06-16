// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from 'react';
import { Network as NetworkIcon, Search, UserPlus, Users, UserCheck, Send, Sparkles, X } from 'lucide-react';
import connectionService from '@/services/connectionService';
import { emitNotificationsChanged } from '@/services/notificationService';
import { emitNetworkChanged } from '@/utils/shellEvents';
import PageHeader from '@/components/ui/PageHeader';
import NetworkStatsGrid from '@/components/network/NetworkStatsGrid';
import ModuleFeedTabs from '@/components/ui/ModuleFeedTabs';
import EmptyState from '@/components/ui/EmptyState';
import NetworkSkeleton from './NetworkSkeleton';
import NetworkPersonCard from './NetworkPersonCard';
import ConnectRequestModal from './ConnectRequestModal';
import NetworkConfirmDialog from './NetworkConfirmDialog';
import PlatformSelect from '@/components/ui/PlatformSelect';
import { NETWORK_CONFIRM_PRESETS } from './networkConfirmConfig';
import { NOTIF_NAV_KEYS, consumeStringKey } from '@/lib/notificationNavigation';
import {
  NETWORK_TABS,
  ROLE_FILTERS,
  DISCOVER_PAGE_SIZE,
  DISCOVER_ADVANCED_FILTERS,
  normalizePerson,
  EMPTY_COPY,
} from './networkUtils';

export default function NetworkPage() {
  const [activeTab, setActiveTab] = useState('connections');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState('');
  const [discoverFilters, setDiscoverFilters] = useState({});
  const [showDiscoverFilters, setShowDiscoverFilters] = useState(false);
  const [people, setPeople] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState(null);
  const [followStats, setFollowStats] = useState(null);
  const [suggestionTotal, setSuggestionTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [connectTarget, setConnectTarget] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fetchSeq = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    const tab = consumeStringKey(NOTIF_NAV_KEYS.NETWORK_TAB);
    if (tab && ['connections', 'pending', 'sent', 'discover', 'suggestions', 'following'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const [s, f] = await Promise.all([
        connectionService.getConnectionStats(),
        connectionService.getFollowStats().catch(() => null),
      ]);
      setStats(s);
      setFollowStats(f);
      const sug = await connectionService.getNetworkSuggestions({ limit: 1, page: 1 });
      setSuggestionTotal(sug.total);
    } catch {
      /* non-blocking */
    }
  }, []);

  const fetchTabData = useCallback(async (append = false, requestPage = 1) => {
    const seq = ++fetchSeq.current;
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');
    try {
      let list = [];
      let resTotal = 0;
      let resPages = 1;

      switch (activeTab) {
        case 'connections': {
          const res = await connectionService.getUserNetwork({
            search: debouncedSearch || undefined,
            user_type: roleFilter !== 'all' ? roleFilter : undefined,
            limit: 48,
            page: requestPage,
          });
          list = (res.users || []).map((u) =>
            normalizePerson(u, {
              connectionId: u.connection_id,
              connectionStatus: 'connected',
            }),
          );
          resTotal = res.total;
          resPages = res.totalPages;
          break;
        }
        case 'pending': {
          const res = await connectionService.getPendingRequests({ limit: 50 });
          list = (res.connections || []).map((row) =>
            normalizePerson(row, {
              connectionRowId: row.id,
              connectionId: row.id,
              connectionStatus: 'pending',
              connectionDirection: 'incoming',
            }),
          );
          resTotal = res.total;
          resPages = 1;
          break;
        }
        case 'sent': {
          const res = await connectionService.getSentRequests({ limit: 50 });
          list = (res.connections || []).map((row) =>
            normalizePerson(row, {
              connectionRowId: row.id,
              connectionId: row.id,
              connectionStatus: 'pending',
              connectionDirection: 'outgoing',
            }),
          );
          resTotal = res.total;
          resPages = 1;
          break;
        }
        case 'discover': {
          const res = await connectionService.discoverUsers({
            q: debouncedSearch || undefined,
            user_type: roleFilter !== 'all' ? roleFilter : undefined,
            skills: skillFilter.trim() || undefined,
            limit: DISCOVER_PAGE_SIZE,
            page: requestPage,
            ...Object.fromEntries(
              Object.entries(discoverFilters).filter(([, v]) => String(v || '').trim()),
            ),
          });
          list = (res.users || []).map((u) => normalizePerson(u));
          resTotal = res.total;
          resPages = res.totalPages;
          break;
        }
        case 'suggestions': {
          const res = await connectionService.getNetworkSuggestions({
            limit: 24,
            page: requestPage,
            user_type: roleFilter !== 'all' ? roleFilter : undefined,
          });
          setSuggestionTotal(res.total);
          list = (res.users || []).map((u) => normalizePerson(u));
          resTotal = res.total;
          resPages = res.totalPages;
          break;
        }
        case 'following': {
          const res = await connectionService.getFollowing({ limit: 48, page: requestPage });
          list = (res.users || []).map((u) => normalizePerson(u));
          resTotal = res.total;
          resPages = res.totalPages;
          break;
        }
        default:
          break;
      }

      if (seq === fetchSeq.current) {
        setPeople((prev) => (append ? [...prev, ...list] : list));
        setTotal(resTotal);
        setTotalPages(resPages);
        setPage(requestPage);
      }
      await loadStats();
    } catch (err) {
      if (seq === fetchSeq.current) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Failed to load network';
        console.error('[Network]', activeTab, msg, err?.response?.data || err);
        setError(msg);
        if (!append) setPeople([]);
      }
    } finally {
      if (seq === fetchSeq.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [activeTab, debouncedSearch, roleFilter, skillFilter, discoverFilters, loadStats]);

  useEffect(() => {
    setPage(1);
    void fetchTabData(false, 1);
  }, [activeTab, debouncedSearch, roleFilter, skillFilter, discoverFilters, fetchTabData]);

  useEffect(() => {
    const onNetworkChanged = () => {
      void loadStats();
      void fetchTabData();
    };
    window.addEventListener('app:network-changed', onNetworkChanged);
    return () => window.removeEventListener('app:network-changed', onNetworkChanged);
  }, [loadStats, fetchTabData]);

  const refresh = () => fetchTabData(false, 1);
  const loadMore = () => {
    if (loadingMore || loading || page >= totalPages) return;
    void fetchTabData(true, page + 1);
  };

  const hasMore = page < totalPages;
  const supportsPagination = activeTab === 'discover' || activeTab === 'suggestions';

  const handleSendRequest = async (userId, message) => {
    setActionBusy(true);
    setError('');
    const target = connectTarget;
    try {
      await connectionService.sendConnectionRequest(userId, message);
      setConnectTarget(null);
      setRequestMessage('');
      setSuccessMsg(
        target?.name
          ? `Invitation sent to ${target.name}.`
          : 'Connection invitation sent.',
      );
      setPeople((prev) =>
        prev.map((p) =>
          String(p.userId) === String(userId)
            ? { ...p, connectionStatus: 'pending', connectionDirection: 'outgoing' }
            : p,
        ),
      );
      emitNotificationsChanged();
      emitNetworkChanged();
      await loadStats();
      if (activeTab === 'sent') await refresh();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to send request');
    } finally {
      setActionBusy(false);
    }
  };

  const handleAccept = async (connectionId) => {
    setActionBusy(true);
    setError('');
    setSuccessMsg('');
    try {
      await connectionService.acceptConnectionRequest(connectionId);
      setSuccessMsg('Connection accepted. They now appear under My connections.');
      setPeople((prev) => prev.filter((p) => String(p.connectionId) !== String(connectionId)));
      emitNotificationsChanged();
      emitNetworkChanged();
      await loadStats();
      setActiveTab('connections');
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to accept request');
    } finally {
      setActionBusy(false);
    }
  };

  const handleDecline = async (connectionId) => {
    setActionBusy(true);
    setError('');
    setSuccessMsg('');
    try {
      await connectionService.declineConnectionRequest(connectionId);
      setSuccessMsg('Invitation declined.');
      setPeople((prev) => prev.filter((p) => String(p.connectionId) !== String(connectionId)));
      emitNotificationsChanged();
      emitNetworkChanged();
      await loadStats();
      await refresh();
      return true;
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to decline request');
      return false;
    } finally {
      setActionBusy(false);
    }
  };

  const handleWithdraw = async (connectionId) => {
    setActionBusy(true);
    setError('');
    try {
      await connectionService.withdrawConnectionRequest(connectionId);
      emitNetworkChanged();
      await loadStats();
      await refresh();
      return true;
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to withdraw request');
      return false;
    } finally {
      setActionBusy(false);
    }
  };

  const handleRemove = async (connectionId) => {
    setActionBusy(true);
    setError('');
    try {
      await connectionService.removeConnection(connectionId);
      emitNetworkChanged();
      await loadStats();
      await refresh();
      return true;
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to remove connection');
      return false;
    } finally {
      setActionBusy(false);
    }
  };

  const handleFollow = async (person) => {
    setActionBusy(true);
    try {
      await connectionService.followUser(person.userId);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setActionBusy(false);
    }
  };

  const handleUnfollow = async (person) => {
    setActionBusy(true);
    setError('');
    try {
      await connectionService.unfollowUser(person.userId);
      await refresh();
      return true;
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to unfollow user');
      return false;
    } finally {
      setActionBusy(false);
    }
  };

  const findPersonByConnectionId = (connectionId) =>
    people.find((p) => String(p.connectionId) === String(connectionId));

  const requestRemove = (connectionId) => {
    const person = findPersonByConnectionId(connectionId);
    if (person) setConfirmAction({ type: 'remove', person, connectionId });
  };

  const requestDecline = (connectionId) => {
    const person = findPersonByConnectionId(connectionId);
    if (person) setConfirmAction({ type: 'decline', person, connectionId });
  };

  const requestWithdraw = (connectionId) => {
    const person = findPersonByConnectionId(connectionId);
    if (person) setConfirmAction({ type: 'withdraw', person, connectionId });
  };

  const requestUnfollow = (person) => {
    setConfirmAction({ type: 'unfollow', person });
  };

  const executeConfirm = async () => {
    if (!confirmAction || actionBusy) return;
    const { type, person, connectionId } = confirmAction;
    let ok = false;
    if (type === 'remove') ok = await handleRemove(connectionId);
    else if (type === 'decline') ok = await handleDecline(connectionId);
    else if (type === 'withdraw') ok = await handleWithdraw(connectionId);
    else if (type === 'unfollow') ok = await handleUnfollow(person);
    if (ok) setConfirmAction(null);
  };

  const tabCounts = {
    connections: stats?.accepted || 0,
    pending: stats?.pending_received || 0,
    sent: stats?.pending_sent || 0,
    suggestions: suggestionTotal,
    following: followStats?.following_count || 0,
  };

  const empty = EMPTY_COPY[activeTab] || EMPTY_COPY.connections;

  const feedTabs = NETWORK_TABS.map((tab) => ({
    key: tab.key,
    label: tab.label,
    count: tabCounts[tab.key] ?? 0,
  }));

  const statItems = stats
    ? [
        {
          key: 'connections',
          label: 'Connections',
          value: stats.accepted || 0,
          description: 'Your professional network',
          icon: Users,
          tone: 'sky',
        },
        {
          key: 'pending',
          label: 'Invitations',
          value: stats.pending_received || 0,
          description: 'Requests waiting for you',
          icon: UserCheck,
          tone: 'emerald',
        },
        {
          key: 'sent',
          label: 'Sent',
          value: stats.pending_sent || 0,
          description: 'Awaiting a response',
          icon: Send,
          tone: 'amber',
        },
        {
          key: 'following',
          label: 'Following',
          value: followStats?.following_count || 0,
          description: 'People you follow',
          icon: Sparkles,
          tone: 'violet',
        },
      ]
    : [];

  const cardVariant =
    activeTab === 'pending'
      ? 'pending'
      : activeTab === 'sent'
        ? 'sent'
        : activeTab === 'suggestions' || activeTab === 'discover'
          ? activeTab
          : activeTab === 'following'
            ? 'following'
            : 'connection';

  return (
    <div className="platform-page">
      <div className="platform-page__container net-page-stack">
        <PageHeader
          icon={NetworkIcon}
          badge="Professional network"
          title="My Network"
          description="Build meaningful connections with students, alumni, teachers, and peers across colleges."
          variant="sky"
          action={
            <button
              type="button"
              onClick={() => {
                setActiveTab('discover');
                setSearchTerm('');
              }}
              className="platform-hero__cta text-sky-700 hover:bg-sky-50"
            >
              <UserPlus className="h-4 w-4" />
              Find people
            </button>
          }
        />

        {statItems.length > 0 ? (
          <NetworkStatsGrid
            className="net-page__stats"
            items={statItems}
            activeKey={activeTab}
            onSelect={setActiveTab}
          />
        ) : null}

        <div className="net-feed-tabs">
          <ModuleFeedTabs
            shellClassName="net-feed-tabs__shell"
            className="net-feed-tabs__tabs"
            tabs={feedTabs}
            activeKey={activeTab}
            onChange={setActiveTab}
            ariaLabel="Network sections"
          />
        </div>

        {(activeTab === 'connections' ||
          activeTab === 'suggestions' ||
          activeTab === 'discover' ||
          activeTab === 'following') && (
          <div className="platform-toolbar">
            <div className="net-toolbar-row">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60"
                  aria-hidden
                />
                <input
                  type="search"
                  placeholder={
                    activeTab === 'discover'
                      ? 'Search name, college, degree, branch, skills, company…'
                      : activeTab === 'suggestions'
                        ? 'Filter suggestions by role below'
                        : 'Search your network…'
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="platform-search"
                  aria-label="Search network"
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
              <div className="net-toolbar-row__filters">
                {(activeTab === 'connections' ||
                  activeTab === 'suggestions' ||
                  activeTab === 'discover') && (
                  <PlatformSelect
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="net-toolbar-row__select"
                    aria-label="Filter by role"
                  >
                    {ROLE_FILTERS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </PlatformSelect>
                )}
                {activeTab === 'discover' && (
                  <>
                    <input
                      type="text"
                      placeholder="Filter by skill"
                      value={skillFilter}
                      onChange={(e) => setSkillFilter(e.target.value)}
                      className="net-toolbar-row__select"
                      aria-label="Filter by skill"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDiscoverFilters((v) => !v)}
                      className="net-toolbar-row__select whitespace-nowrap font-semibold text-primary"
                    >
                      {showDiscoverFilters ? 'Hide filters' : 'More filters'}
                    </button>
                  </>
                )}
              </div>
            </div>
            {activeTab === 'discover' && showDiscoverFilters ? (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {DISCOVER_ADVANCED_FILTERS.map((f) => (
                  <input
                    key={f.key}
                    type="text"
                    placeholder={f.placeholder}
                    value={discoverFilters[f.key] || ''}
                    onChange={(e) =>
                      setDiscoverFilters((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }
                    className="net-toolbar-row__select"
                    aria-label={f.label}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )}

        {successMsg ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-800">
            <span>{successMsg}</span>
            <button type="button" className="shrink-0 text-sm font-bold underline" onClick={() => setSuccessMsg('')}>
              Dismiss
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/[0.06] px-4 py-3 text-sm text-destructive">
            <span className="min-w-0 flex-1">{error}</span>
            <div className="flex shrink-0 gap-2">
              <button type="button" className="font-semibold underline" onClick={() => void refresh()}>
                Retry
              </button>
              <button type="button" className="font-semibold underline" onClick={() => setError('')}>
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {!loading && people.length > 0 ? (
          <div className="net-content-chrome">
            <p className="net-content-chrome__count">
              Showing {people.length}
              {total > people.length ? ` of ${total}` : ''}{' '}
              {total === 1 ? 'person' : 'people'}
              {debouncedSearch ? ` matching “${debouncedSearch}”` : ''}
            </p>
          </div>
        ) : null}

        <div>
          {loading ? (
            <NetworkSkeleton />
          ) : people.length === 0 ? (
            <EmptyState
              icon={NetworkIcon}
              title={empty.title}
              description={empty.body}
              action={
                <>
                  {activeTab === 'connections' && (stats?.pending_received > 0 || stats?.pending_sent > 0) ? (
                    <p className="mb-4 text-sm text-muted-foreground">
                      You have pending invitations — open{' '}
                      <button
                        type="button"
                        className="font-semibold text-sky-700 underline"
                        onClick={() => setActiveTab('pending')}
                      >
                        Invitations
                      </button>{' '}
                      or{' '}
                      <button
                        type="button"
                        className="font-semibold text-sky-700 underline"
                        onClick={() => setActiveTab('sent')}
                      >
                        Sent
                      </button>
                      .
                    </p>
                  ) : null}
                  {activeTab === 'connections' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('suggestions');
                        setSearchTerm('');
                      }}
                      className="platform-hero__cta inline-flex items-center gap-2 text-sky-700 hover:bg-sky-50"
                    >
                      <UserPlus className="h-4 w-4" />
                      Find people to connect
                    </button>
                  ) : null}
                </>
              }
            />
          ) : (
            <>
              <div className="platform-stagger net-people-grid">
                {people.map((person) => (
                  <NetworkPersonCard
                    key={`${activeTab}-${person.userId}`}
                    person={person}
                    variant={cardVariant}
                    busy={actionBusy}
                    onConnect={setConnectTarget}
                    onAccept={handleAccept}
                    onDecline={requestDecline}
                    onWithdraw={requestWithdraw}
                    onRemove={requestRemove}
                    onFollow={handleFollow}
                    onUnfollow={requestUnfollow}
                  />
                ))}
              </div>
              {supportsPagination && hasMore ? (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="rounded-full border border-border/60 bg-card px-6 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-all hover:border-primary/30 hover:bg-primary/5 disabled:opacity-60"
                  >
                    {loadingMore ? 'Loading…' : `Load more (${people.length} of ${total})`}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <ConnectRequestModal
        person={connectTarget}
        message={requestMessage}
        onMessageChange={setRequestMessage}
        onClose={() => {
          setConnectTarget(null);
          setRequestMessage('');
        }}
        onSend={handleSendRequest}
        sending={actionBusy}
      />

      <NetworkConfirmDialog
        open={Boolean(confirmAction)}
        preset={confirmAction ? NETWORK_CONFIRM_PRESETS[confirmAction.type] : null}
        person={confirmAction?.person}
        loading={actionBusy}
        onCancel={() => {
          if (!actionBusy) setConfirmAction(null);
        }}
        onConfirm={executeConfirm}
      />
    </div>
  );
}
