import { cn } from '@/lib/utils';
import {
  AVATAR_SIZE_CLASSES,
  BADGE_SIZE_CLASSES,
  PRESENCE_CONFIG,
  PRESENCE_STATUS,
} from '@/lib/presence';

const DEFAULT_FALLBACK =
  'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150';

/**
 * Premium presence dot — ring, shadow, optional subtle pulse (online only).
 */
export function PresenceBadge({
  status = PRESENCE_STATUS.ONLINE,
  size = 'md',
  pulse = true,
  className,
  title,
}) {
  if (!status || status === PRESENCE_STATUS.OFFLINE) return null;

  const cfg = PRESENCE_CONFIG[status] || PRESENCE_CONFIG.online;
  const sizeClass = BADGE_SIZE_CLASSES[size] || BADGE_SIZE_CLASSES.md;
  const showPulse = pulse && status === PRESENCE_STATUS.ONLINE;

  return (
    <span
      className={cn(
        'presence-badge',
        showPulse && 'presence-badge--pulse',
        'flex items-center justify-center rounded-full border-card bg-card shadow-sm dark:border-background dark:bg-background',
        sizeClass,
        className,
      )}
      title={title ?? cfg.label}
      aria-label={cfg.label}
      role="status"
    >
      <span
        className={cn(
          'block h-full w-full rounded-full',
          cfg.dotClass,
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]',
        )}
      />
    </span>
  );
}

/** Inline chip: ● Available — for composer headers, toolbars */
export function PresenceLabel({
  status = PRESENCE_STATUS.ONLINE,
  showText = true,
  className,
}) {
  if (!status || status === PRESENCE_STATUS.OFFLINE) return null;
  const cfg = PRESENCE_CONFIG[status] || PRESENCE_CONFIG.online;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-tight',
        cfg.chipClass,
        cfg.labelClass,
        className,
      )}
      role="status"
    >
      <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
        <span
          className={cn(
            'h-full w-full rounded-full shadow-sm ring-2 ring-card dark:ring-background',
            cfg.dotClass,
          )}
        />
        {status === PRESENCE_STATUS.ONLINE ? (
          <span className="absolute inset-[1px] rounded-full bg-emerald-400/25" aria-hidden />
        ) : null}
      </span>
      {showText ? <span>{cfg.label}</span> : null}
    </span>
  );
}

/**
 * Avatar with standardized presence indicator (LinkedIn / Slack style).
 */
export default function UserAvatar({
  src,
  alt = '',
  size = 'md',
  status = PRESENCE_STATUS.ONLINE,
  showStatus = true,
  statusPosition = 'bottom-right',
  pulse = true,
  ring = true,
  className,
  imgClassName,
  fallbackSrc = DEFAULT_FALLBACK,
  onError,
  children,
}) {
  const sizeCfg = AVATAR_SIZE_CLASSES[size] || AVATAR_SIZE_CLASSES.md;
  const displayStatus = showStatus ? status : null;

  const badgePosition =
    statusPosition === 'bottom-left'
      ? 'presence-badge--bottom-left'
      : 'presence-badge--bottom-right';

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 align-middle',
        sizeCfg.box,
        className,
      )}
    >
      <img
        src={src || fallbackSrc}
        alt={alt}
        className={cn(
          'h-full w-full rounded-full object-cover',
          ring && sizeCfg.ring,
          imgClassName,
        )}
        onError={(e) => {
          e.currentTarget.src = fallbackSrc;
          onError?.(e);
        }}
      />
      {displayStatus ? (
        <PresenceBadge
          status={displayStatus}
          size={sizeCfg.badge}
          pulse={pulse}
          className={cn('absolute z-10', badgePosition)}
        />
      ) : null}
      {children}
    </span>
  );
}

export { DEFAULT_FALLBACK as AVATAR_FALLBACK };
