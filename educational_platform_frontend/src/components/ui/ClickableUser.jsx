import { cn } from '@/lib/utils';
import UserAvatar from '@/components/ui/UserAvatar';
import { useProfileNavigationOptional } from '@/contexts/ProfileNavigationContext';

/**
 * Clickable avatar + optional name — opens the member's public profile.
 */
export default function ClickableUser({
  userId,
  name,
  avatarUrl,
  subtitle,
  size = 'md',
  showName = false,
  showAvatar = true,
  showStatus = true,
  status,
  layout = 'row',
  className,
  nameClassName,
  disabled = false,
}) {
  const nav = useProfileNavigationOptional();
  const canOpen = Boolean(userId) && !disabled && nav?.openProfile;

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (canOpen) nav.openProfile(userId);
  };

  const inner = (
    <>
      {showAvatar ? (
        <UserAvatar
          src={avatarUrl}
          alt={name || 'User'}
          size={size}
          showStatus={showStatus}
          status={status}
          className={cn(canOpen && 'transition-transform duration-200 group-hover:scale-[1.03]')}
        />
      ) : null}
      {showName && name ? (
        <div className={cn('min-w-0 text-left', layout === 'col' && 'mt-1 text-center')}>
          <p
            className={cn(
              'truncate font-semibold text-foreground transition-colors',
              canOpen && 'group-hover:text-primary',
              nameClassName,
            )}
          >
            {name}
          </p>
          {subtitle ? (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      ) : null}
    </>
  );

  if (!canOpen) {
    return (
      <div
        className={cn(
          'inline-flex min-w-0 items-center gap-2',
          layout === 'col' && 'flex-col',
          className,
        )}
      >
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'group inline-flex min-w-0 items-center gap-2 rounded-lg text-left transition-colors',
        'hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
        layout === 'col' && 'flex-col',
        className,
      )}
      aria-label={name ? `View ${name}'s profile` : 'View profile'}
    >
      {inner}
    </button>
  );
}
