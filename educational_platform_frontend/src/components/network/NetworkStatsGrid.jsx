import { cn } from '@/lib/utils';

function formatStatValue(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return '0';
  return n.toLocaleString();
}

/**
 * Premium network metrics — large count, label, optional description.
 * Cards are clickable when `onSelect` + `item.key` are provided.
 */
export default function NetworkStatsGrid({
  items = [],
  activeKey,
  onSelect,
  className,
}) {
  if (!items.length) return null;

  return (
    <div className={cn('net-stats-grid', className)}>
      {items.map(({ key, label, value, description, icon: Icon, tone = 'sky' }) => {
        const isInteractive = Boolean(onSelect && key);
        const Tag = isInteractive ? 'button' : 'div';

        return (
          <Tag
            key={key || label}
            type={isInteractive ? 'button' : undefined}
            className={cn(
              'net-stat-card',
              `net-stat-card--${tone}`,
              activeKey && key === activeKey && 'net-stat-card--active',
            )}
            onClick={isInteractive ? () => onSelect(key) : undefined}
            aria-current={activeKey && key === activeKey ? 'true' : undefined}
          >
            {Icon ? (
              <span className="net-stat-card__icon-wrap" aria-hidden>
                <Icon />
              </span>
            ) : null}
            <p className="net-stat-card__value">{formatStatValue(value)}</p>
            <p className="net-stat-card__label">{label}</p>
            {description ? (
              <p className="net-stat-card__desc">{description}</p>
            ) : null}
          </Tag>
        );
      })}
    </div>
  );
}
