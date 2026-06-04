import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SIDEBAR_BRAND } from './navConfig';
import { useSidebar } from './SidebarProvider';

export default function SidebarHeader({
  onMobileClose,
  showClose = false,
  showCollapseControl = true,
}) {
  const { collapsed, toggleCollapsed } = useSidebar();

  return (
    <header
      className={cn(
        'sidebar-header shrink-0',
        collapsed ? 'sidebar-header--collapsed' : 'sidebar-header--expanded',
      )}
    >
      <div
        className={cn(
          'sidebar-header__inner',
          collapsed ? 'flex-col gap-2.5 py-3.5' : 'flex-row gap-2 py-3.5 pl-3.5 pr-2.5',
        )}
      >
        <div
          className={cn(
            'flex min-w-0 items-center',
            collapsed ? 'justify-center' : 'min-w-0 flex-1 gap-3',
          )}
          title={SIDEBAR_BRAND.name}
        >
          <div className="sidebar-header__mark" aria-hidden>
            <span className="sidebar-header__mark-text">{SIDEBAR_BRAND.mark}</span>
          </div>
          {!collapsed ? (
            <p className="sidebar-header__title truncate">{SIDEBAR_BRAND.name}</p>
          ) : null}
        </div>

        <div
          className={cn(
            'flex shrink-0 items-center',
            collapsed ? 'flex-col gap-1' : 'gap-0.5',
          )}
        >
          {showCollapseControl ? (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="sidebar-header__toggle hidden md:inline-flex"
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
              className="sidebar-header__toggle md:hidden"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
