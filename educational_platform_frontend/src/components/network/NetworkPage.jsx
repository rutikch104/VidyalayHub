// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from 'react';
import { Network as NetworkIcon, Search, UserPlus, Users, UserCheck, Send, Sparkles, X } from 'lucide-react';
import connectionService from '@/services/connectionService';
import { emitNotificationsChanged } from '@/services/notificationService';
import { emitNetworkChanged } from '@/utils/shellEvents';
import PageHeader from '@/components/ui/PageHeader';
import ModuleStatsGrid from '@/components/ui/ModuleStatsGrid';
import ModuleFeedTabs from '@/components/ui/ModuleFeedTabs';
import EmptyState from '@/components/ui/EmptyState';
import NetworkSkeleton from './NetworkSkeleton';
import NetworkPersonCard from './NetworkPersonCard';
import ConnectRequestModal from './ConnectRequestModal';
import {
  NETWORK_TABS,
  ROLE_FILTERS,
  normalizePerson,
  EMPTY_COPY,
} from './networkUtils';

export default function NetworkPage() {
  const [activeTab, setActiveTab] = useState('connections');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState('');
  const [people, setPeople] = useState([]);
  const [stats, setStats] = useState(null);
  const [followStats, setFollowStats] = useState(null);
  const [suggestionTotal, setSuggestionTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [connectTarget, setConnectTarget] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fetchSeq = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

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

  const fetchTabData = useCallback(async () => {
    const seq = ++fetchSeq.current;
    setLoading(true);
    setError('');
    try {
      let list = [];
      switch (activeTab) {
        case 'connections': {
          const res = await connectionService.getUserNetwork({
            search: debouncedSearch || undefined,
            user_type: roleFilter !== 'all' ? roleFilter : undefined,
            limit: 48,
            page: 1,
          });
          list = (res.users || []).map((u) =>
            normalizePerson(u, {
              connectionId: u.connection_id,
              connectionStatus: 'connected',
            }),
          );
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
          break;
        }
        case 'discover': {
          if (!debouncedSearch && roleFilter === 'all' && !skillFilter.trim()) {
            list = [];
            break;
          }
          const res = await connectionService.discoverUsers({
            q: debouncedSearch || undefined,
            user_type: roleFilter !== 'all' ? roleFilter : undefined,
            skills: skillFilter.trim() || undefined,
            limit: 36,
            page: 1,
          });
          list = (res.users || []).map((u) => normalizePerson(u));
          break;
        }
        case 'suggestions': {
          const res = await connectionService.getNetworkSuggestions({
            limit: 24,
            page: 1,
            user_type: roleFilter !== 'all' ? roleFilter : undefined,
          });
          setSuggestionTotal(res.total);
          list = (res.users || []).map((u) => normalizePerson(u));
          break;
        }
        case 'following': {
          const res = await connectionService.getFollowing({ limit: 48, page: 1 });
          list = (res.users || []).map((u) => normalizePerson(u));
          break;
        }
        default:
          break;
      }
      if (seq === fetchSeq.current) setPeople(list);
      await loadStats();
    } catch (err) {
      if (seq === fetchSeq.current) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Failed to load network';
        console.error('[Network]', activeTab, msg, err?.response?.data || err);
        setError(msg);
        setPeople([]);
      }
    } finally {
      if (seq === fetchSeq.current) setLoading(false);
    }
  }, [activeTab, debouncedSearch, roleFilter, skillFilter, loadStats]);

  useEffect(() => {
    void fetchTabData();
  }, [fetchTabData]);

  useEffect(() => {
    const onNetworkChanged = () => {
      void loadStats();
      void fetchTabData();
    };
    window.addEventListener('app:network-changed', onNetworkChanged);
    return () => window.removeEventListener('app:network-changed', onNetworkChanged);
  }, [loadStats, fetchTabData]);

  const refresh = () => fetchTabData();

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
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to decline request');
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
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to withdraw request');
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
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to remove connection');
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
    try {
      await connectionService.unfollowUser(person.userId);
      await refresh();
    } finally {
      setActionBusy(false);
    }
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
        { label: 'Connections', value: stats.accepted || 0, icon: Users },
        { label: 'Invitations', value: stats.pending_received || 0, icon: UserCheck },
        { label: 'Sent', value: stats.pending_sent || 0, icon: Send },
        { label: 'Following', value: followStats?.following_count || 0, icon: Sparkles },
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
          <ModuleStatsGrid className="net-page__stats" items={statItems} theme="sky" />
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
                      ? 'Search by name, bio, or location…'
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
                  <select
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
                  </select>
                )}
                {activeTab === 'discover' && (
                  <input
                    type="text"
                    placeholder="Filter by skill"
                    value={skillFilter}
                    onChange={(e) => setSkillFilter(e.target.value)}
                    className="net-toolbar-row__select"
                    aria-label="Filter by skill"
                  />
                )}
              </div>
            </div>
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
              {people.length} {people.length === 1 ? 'person' : 'people'}
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
                  {activeTab === 'discover' && !debouncedSearch ? (
                    <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Type a name or skill to start searching
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
            <div className="platform-stagger net-people-grid">
              {people.map((person) => (
                <NetworkPersonCard
                  key={`${activeTab}-${person.userId}`}
                  person={person}
                  variant={cardVariant}
                  busy={actionBusy}
                  onConnect={setConnectTarget}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                  onWithdraw={handleWithdraw}
                  onRemove={handleRemove}
                  onFollow={handleFollow}
                  onUnfollow={handleUnfollow}
                />
              ))}
            </div>
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
    </div>
  );
}
