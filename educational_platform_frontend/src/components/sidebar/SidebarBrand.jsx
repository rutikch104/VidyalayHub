import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SIDEBAR_BRAND } from './navConfig';
import { PLATFORM_BRAND } from '@/lib/platformBranding';

export default function SidebarBrand({
  collapsed = false,
  onToggleCollapse,
  onMobileClose,
  showCollapseControl = true,
  showClose = false,
}) {
  return (
    <div
      className={cn(
        'sidebar-brand flex shrink-0 items-center border-b border-sidebar-border/60',
        collapsed ? 'justify-center px-2 py-4' : 'justify-between gap-2 px-4 py-4',
      )}
    >
      <div
        className={cn(
          'sidebar-brand__identity flex min-w-0 items-center gap-3 rounded-xl',
          !collapsed && 'min-w-0 flex-1',
        )}
        title={PLATFORM_BRAND.name}
      >
        <div className="sidebar-brand__mark relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground shadow-[0_8px_24px_hsl(var(--primary)/0.35)] ring-1 ring-white/15 dark:ring-white/10">
          <span className="font-display text-sm font-extrabold tracking-tight">{SIDEBAR_BRAND.mark}</span>
        </div>
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <p className="sidebar-brand__title font-display truncate text-[15px] font-bold leading-tight tracking-tight text-sidebar-foreground">
              {SIDEBAR_BRAND.name}
            </p>
            <p className="sidebar-brand__tagline mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              {SIDEBAR_BRAND.tagline}
            </p>
          </div>
        ) : null}
      </div>

      <div className={cn('flex items-center gap-0.5', collapsed && 'flex-col')}>
        {showCollapseControl && onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden rounded-lg p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground lg:flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" strokeWidth={2} />
            ) : (
              <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
        ) : null}
        {showClose && onMobileClose ? (
          <button
            type="button"
            onClick={onMobileClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
