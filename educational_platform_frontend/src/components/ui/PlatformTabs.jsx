import { cn } from '@/lib/utils';

/**
 * Platform-standard tab navigation (Notifications reference design).
 * Pill active state, icon + label + optional count badge.
 *
 * @param {Array<{ key?: string, id?: string, label: string, icon?: React.ComponentType, count?: number }>} tabs
 * @param {string} activeKey
 * @param {(key: string) => void} onChange
 * @param {boolean} [shell] - Wrap in elevated card shell (module pages)
 * @param {'default'|'compact'} [size]
 */
export default function PlatformTabs({
  tabs = [],
  activeKey,
  onChange,
  ariaLabel = 'Sections',
  className,
  shell = false,
  shellClassName,
  size = 'default',
}) {
  const list = (
    <div
      className={cn(
        'platform-tabs',
        size === 'compact' && 'platform-tabs--compact',
        className,
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => {
        const key = tab.key ?? tab.id;
        const Icon = tab.icon;
        const isActive = activeKey === key;
        const showCount = typeof tab.count === 'number' && tab.count > 0;

        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-tab-id={key}
            onClick={() => onChange(key)}
            className={cn(
              'platform-tabs__tab',
              isActive && 'platform-tabs__tab--active',
            )}
          >
            {Icon ? <Icon className="platform-tabs__tab-icon" aria-hidden /> : null}
            <span className="platform-tabs__tab-label">{tab.label}</span>
            {showCount ? (
              <span
                className={cn(
                  'platform-tabs__tab-count',
                  isActive && 'platform-tabs__tab-count--active',
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );

  if (shell) {
    return <div className={cn('platform-tabs-shell', shellClassName)}>{list}</div>;
  }

  return list;
}
