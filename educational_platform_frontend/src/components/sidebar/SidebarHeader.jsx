import { PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SIDEBAR_BRAND } from './navConfig';
import { useSidebar } from './SidebarProvider';

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || '');
const SEARCH_SHORTCUT = isMac ? '⌘K' : 'Ctrl K';

export default function SidebarHeader({
  onMobileClose,
  showClose = false,
  showCollapseControl = true,
}) {
  const { collapsed, toggleCollapsed } = useSidebar();

  const openGlobalSearch = () => {
    window.dispatchEvent(new CustomEvent('vh:open-global-search'));
    onMobileClose?.();
  };

  return (
    <header
      className={cn(
        'sidebar-header shrink-0 border-b border-sidebar-border/70',
        collapsed ? 'px-2 py-3' : 'px-3 py-3',
      )}
    >
      <div
        className={cn(
          'flex items-center',
          collapsed ? 'flex-col gap-2' : 'gap-2',
        )}
      >
        <div
          className={cn(
            'flex min-w-0 items-center',
            collapsed ? 'justify-center' : 'min-w-0 flex-1 gap-2.5',
          )}
          title={SIDEBAR_BRAND.name}
        >
          <div
            className="sidebar-header__mark flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[var(--primary-glow)] text-primary-foreground shadow-[0_4px_12px_-2px_color-mix(in_oklab,var(--primary)_45%,transparent)]"
            aria-hidden
          >
            <span className="font-display text-sm font-bold tracking-tight">{SIDEBAR_BRAND.mark}</span>
          </div>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
                {SIDEBAR_BRAND.name}
              </p>
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">
                {SIDEBAR_BRAND.tagline}
              </p>
            </div>
          ) : null}
        </div>

        <div className={cn('flex items-center gap-0.5', collapsed && 'flex-col')}>
          {showCollapseControl ? (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground/60 transition-all duration-200 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground md:inline-flex"
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
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground/60 transition-all duration-200 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground md:hidden"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {!collapsed ? (
        <button
          type="button"
          onClick={openGlobalSearch}
          className="sidebar-header__search mt-3 flex h-8 w-full items-center gap-2 rounded-md border border-sidebar-border/80 bg-sidebar-accent/40 px-2.5 text-left transition-all duration-200 hover:border-primary/40 hover:bg-sidebar-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15"
          aria-label="Open search"
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/40" aria-hidden />
          <span className="flex-1 text-xs text-sidebar-foreground/45">Search…</span>
          <kbd className="sidebar-header__kbd hidden rounded border border-sidebar-border/80 bg-background/80 px-1.5 py-0.5 text-[9px] font-medium text-sidebar-foreground/50 sm:inline">
            {SEARCH_SHORTCUT}
          </kbd>
        </button>
      ) : (
        <button
          type="button"
          onClick={openGlobalSearch}
          className="mt-2 flex h-8 w-full items-center justify-center rounded-md border border-sidebar-border/80 bg-sidebar-accent/40 text-sidebar-foreground/40 transition-all duration-200 hover:border-primary/40 hover:text-sidebar-foreground md:flex"
          aria-label="Open search"
          title="Search"
        >
          <Search className="h-3.5 w-3.5" />
        </button>
      )}
    </header>
  );
}
