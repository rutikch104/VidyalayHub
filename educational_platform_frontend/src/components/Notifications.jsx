// @ts-nocheck
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bell,
  Check,
  Trash2,
  Settings,
  RefreshCw,
} from 'lucide-react';
import notificationService, { emitNotificationsChanged } from '@/services/notificationService';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import NotificationItem from '@/components/notifications/NotificationItem';
import NotificationListSkeleton from '@/components/notifications/NotificationListSkeleton';
import NotificationFeedChrome from '@/components/notifications/NotificationFeedChrome';
import { isNotificationUnread } from '@/components/notifications/notificationUtils';

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
];

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [showSettings, setShowSettings] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await notificationService.getUserNotifications({
        page: 1,
        limit: 50,
        read: filter === 'read' ? true : filter === 'unread' ? false : undefined,
      });
      setNotifications(response.notifications || []);
      emitNotificationsChanged();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await notificationService.getNotificationStats();
      setStats(response);
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
    void fetchStats();
  }, [fetchNotifications, fetchStats]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      const updated = await notificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? updated || { ...n, read_at: new Date().toISOString(), is_read: true }
            : n,
        ),
      );
      void fetchStats();
      emitNotificationsChanged();
    } catch {
      /* ignore */
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || now, is_read: true })),
      );
      void fetchStats();
      emitNotificationsChanged();
    } catch {
      /* ignore */
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      void fetchStats();
      emitNotificationsChanged();
    } catch {
      /* ignore */
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedNotifications.length === 0) return;
    try {
      await notificationService.bulkNotificationOperations(selectedNotifications, action);
      if (action === 'mark_read') {
        const now = new Date().toISOString();
        setNotifications((prev) =>
          prev.map((n) =>
            selectedNotifications.includes(n.id)
              ? { ...n, read_at: n.read_at || now, is_read: true }
              : n,
          ),
        );
      } else {
        setNotifications((prev) => prev.filter((n) => !selectedNotifications.includes(n.id)));
      }
      setSelectedNotifications([]);
      void fetchStats();
      emitNotificationsChanged();
    } catch {
      /* ignore */
    }
  };

  const toggleNotificationSelection = (notificationId) => {
    setSelectedNotifications((prev) =>
      prev.includes(notificationId)
        ? prev.filter((id) => id !== notificationId)
        : [...prev, notificationId],
    );
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const unread = isNotificationUnread(n);
      if (filter === 'unread') return unread;
      if (filter === 'read') return !unread;
      return true;
    });
  }, [notifications, filter]);

  const allVisibleSelected =
    filteredNotifications.length > 0 &&
    filteredNotifications.every((n) => selectedNotifications.includes(n.id));

  const handleSelectAllVisible = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(filteredNotifications.map((n) => n.id));
      setSelectedNotifications((prev) => prev.filter((id) => !visibleIds.has(id)));
    } else {
      const ids = filteredNotifications.map((n) => n.id);
      setSelectedNotifications((prev) => [...new Set([...prev, ...ids])]);
    }
  };

  const feedTabs = FILTER_TABS.map((tab) => ({
    ...tab,
    count:
      tab.key === 'unread'
        ? stats?.unread || 0
        : tab.key === 'read'
          ? stats?.by_read_status?.read || 0
          : stats?.total || 0,
  }));

  const unreadInList = filteredNotifications.filter(isNotificationUnread).length;

  return (
    <div className="platform-page">
      <div className="platform-page__container">
        <PageHeader
          icon={Bell}
          badge="Activity & alerts"
          title="Notifications"
          description="Stay on top of likes, comments, connections, events, and everything happening across your network."
          variant="slate"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void fetchNotifications();
                  void fetchStats();
                }}
                aria-label="Refresh"
                title="Refresh"
                className="rounded-xl border border-white/30 bg-white/10 p-2.5 text-white backdrop-blur transition-colors hover:bg-white/20"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setShowSettings((s) => !s)}
                aria-label="Notification settings"
                title="Settings"
                className="rounded-xl border border-white/30 bg-white/10 p-2.5 text-white backdrop-blur transition-colors hover:bg-white/20"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="platform-hero__cta text-slate-800 hover:bg-slate-100"
              >
                <Check className="h-4 w-4" />
                Mark all read
              </button>
            </div>
          }
        />

        {showSettings && (
          <p className="mt-4 rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Notification preferences are managed in{' '}
            <span className="font-semibold text-foreground">Settings → Notifications</span>.
          </p>
        )}

        {selectedNotifications.length > 0 && (
          <div className="platform-toolbar mt-6 mb-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">
                {selectedNotifications.length} selected
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBulkAction('mark_read')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/60 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-100"
                >
                  <Check className="h-3.5 w-3.5" />
                  Mark read
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkAction('delete')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200/60 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="notif-inbox">
          <NotificationFeedChrome
            tabs={feedTabs}
            activeKey={filter}
            onChange={setFilter}
            loading={loading}
            listCount={filteredNotifications.length}
            unreadInList={unreadInList}
            filter={filter}
            allSelected={allVisibleSelected}
            onSelectAll={handleSelectAllVisible}
          />

          <section className="notif-feed" aria-label="Notification feed">
          {loading ? (
            <NotificationListSkeleton count={5} />
          ) : filteredNotifications.length === 0 ? (
            <div className="notif-feed__empty px-4 py-10 sm:px-6">
              <EmptyState
                icon={Bell}
                title={filter === 'unread' ? "You're all caught up" : 'No notifications'}
                description={
                  filter === 'unread'
                    ? 'No unread notifications right now.'
                    : 'When something happens on your account, it will show up here.'
                }
              />
            </div>
          ) : (
            <div className="notif-feed__list platform-stagger">
              {filteredNotifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  selected={selectedNotifications.includes(n.id)}
                  onToggleSelect={() => toggleNotificationSelection(n.id)}
                  onMarkRead={handleMarkAsRead}
                  onDelete={handleDeleteNotification}
                />
              ))}
            </div>
          )}
          </section>
        </div>
      </div>
    </div>
  );
}
