import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export default function SidebarNavItem({
  icon: Icon,
  label,
  description,
  active = false,
  collapsed = false,
  badge,
  isNew,
  onClick,
}) {
  const badgeValue = badge != null && badge > 0 ? (badge > 99 ? '99+' : badge) : null;

  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'sidebar-nav-item group relative flex w-full cursor-pointer items-center text-left outline-none transition-all duration-200',
        'focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar',
        collapsed ? 'justify-center rounded-lg px-2 py-2' : 'gap-2.5 rounded-lg px-3 py-2',
        active
          ? 'sidebar-nav-item--active text-sidebar-foreground'
          : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground',
      )}
    >
      {active && !collapsed ? (
        <span
          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary"
          aria-hidden
        />
      ) : null}

      <span
        className={cn(
          'relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-all duration-200',
          active
            ? 'bg-primary/10 text-primary'
            : 'text-sidebar-foreground/65 group-hover:text-sidebar-foreground',
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 2} />
        {collapsed && badgeValue ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
            {badgeValue}
          </span>
        ) : null}
        {collapsed && isNew && !badgeValue ? (
          <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-primary ring-2 ring-[var(--sidebar)]" />
        ) : null}
      </span>

      {!collapsed ? (
        <>
          <span className="relative z-[1] min-w-0 flex-1">
            <span
              className={cn(
                'block truncate text-[13.5px] leading-tight tracking-tight',
                active ? 'font-semibold' : 'font-medium',
              )}
            >
              {label}
            </span>
            {description ? (
              <span className="mt-0.5 block truncate text-[11.5px] font-normal text-sidebar-foreground/50">
                {description}
              </span>
            ) : null}
          </span>

          <span className="relative z-[1] flex shrink-0 items-center gap-1.5">
            {badgeValue ? (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold tabular-nums text-destructive-foreground">
                {badgeValue}
              </span>
            ) : null}
            {isNew && !badgeValue ? (
              <span className="sidebar-nav-item__badge-new rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider">
                New
              </span>
            ) : null}
          </span>
        </>
      ) : null}
    </button>
  );

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" className="text-xs font-medium">
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}
