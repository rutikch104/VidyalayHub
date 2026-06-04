// @ts-nocheck
import { Inbox, Bell, MailOpen } from 'lucide-react';
import PlatformTabs from '@/components/ui/PlatformTabs';

const TAB_ICONS = {
  all: Inbox,
  unread: Bell,
  read: MailOpen,
};

export default function NotificationFeedChrome({
  tabs = [],
  activeKey,
  onChange,
  loading = false,
  listCount = 0,
  unreadInList = 0,
  filter = 'all',
  allSelected = false,
  onSelectAll,
  showToolbar = true,
}) {
  const filterLabel =
    filter === 'unread' ? 'unread' : filter === 'read' ? 'read' : '';

  const tabsWithIcons = tabs.map((tab) => ({
    ...tab,
    icon: tab.icon || TAB_ICONS[tab.key],
  }));

  return (
    <header className="notif-chrome">
      <PlatformTabs
        tabs={tabsWithIcons}
        activeKey={activeKey}
        onChange={onChange}
        ariaLabel="Filter notifications"
      />

      {showToolbar && (
        <div className="notif-chrome__toolbar">
          <div className="notif-chrome__summary">
            <span className="notif-chrome__summary-icon-wrap" aria-hidden>
              <Inbox className="h-4 w-4" />
            </span>
            <p className="notif-chrome__summary-text">
              {loading ? (
                <span className="notif-chrome__summary-muted">Loading…</span>
              ) : (
                <>
                  <span className="notif-chrome__summary-value">{listCount}</span>
                  <span className="notif-chrome__summary-muted">
                    {' '}
                    notification{listCount === 1 ? '' : 's'}
                    {filterLabel ? ` · ${filterLabel}` : ''}
                    {!loading && unreadInList > 0 && filter !== 'read' ? (
                      <>
                        {' '}
                        ·{' '}
                        <span className="notif-chrome__summary-highlight">
                          {unreadInList} unread
                        </span>
                      </>
                    ) : null}
                  </span>
                </>
              )}
            </p>
          </div>

          {!loading && listCount > 0 && (
            <label
              className={[
                'notif-chrome__select-all',
                allSelected ? 'notif-chrome__select-all--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onSelectAll}
                className="notif-chrome__checkbox"
                aria-label="Select all visible notifications"
              />
              <span>{allSelected ? 'Deselect all' : 'Select all'}</span>
            </label>
          )}
        </div>
      )}
    </header>
  );
}
