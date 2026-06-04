import { cn } from '@/lib/utils';

/**
 * Consistent empty state for feeds, lists, and modules.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}) {
  return (
    <div
      className={cn(
        'platform-empty',
        compact && 'py-10',
        className,
      )}
      role="status"
    >
      {Icon ? (
        <div className="platform-empty__icon">
          <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
        </div>
      ) : null}
      {title ? <p className="platform-empty__title">{title}</p> : null}
      {description ? <p className="platform-empty__desc">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
