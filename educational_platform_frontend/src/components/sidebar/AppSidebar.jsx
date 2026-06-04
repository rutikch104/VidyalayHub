import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { SidebarProvider, useSidebar } from './SidebarProvider';
import SidebarHeader from './SidebarHeader';
import SidebarNav from './SidebarNav';
import SidebarFooter from './SidebarFooter';

function SidebarShell({ collapsed, className, children, isMobile = false }) {
  return (
    <aside
      className={cn(
        'app-sidebar flex h-full flex-col text-sidebar-foreground',
        collapsed ? 'app-sidebar--collapsed w-12' : 'app-sidebar--expanded w-64',
        isMobile && 'app-sidebar--mobile w-[18rem]',
        className,
      )}
      data-collapsed={collapsed ? 'true' : 'false'}
      aria-label="Main navigation"
    >
      {children}
    </aside>
  );
}

function AppSidebarInner({
  onNavigate,
  currentPage,
  mobileOpen = false,
  onMobileClose,
  messagesBadge,
  notificationsBadge,
  canSeeSuperAdmin = false,
  canSeeAdmin = false,
}) {
  const { collapsed, closeMobile } = useSidebar();

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onMobileClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen, onMobileClose]);

  const handleNavigate = (page) => {
    onNavigate?.(page);
    closeMobile();
    onMobileClose?.();
  };

  const navProps = {
    currentPage,
    onNavigate: handleNavigate,
    messagesBadge,
    notificationsBadge,
    canSeeSuperAdmin,
    canSeeAdmin,
  };

  return (
    <>
      <SidebarShell
        collapsed={collapsed}
        className="sticky top-16 z-30 hidden shrink-0 md:flex md:h-[calc(100vh-4rem)]"
      >
        <SidebarHeader showCollapseControl />
        <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-1">
          <SidebarNav {...navProps} />
        </div>
        <SidebarFooter currentPage={currentPage} onNavigate={handleNavigate} />
      </SidebarShell>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <button
            type="button"
            className="sidebar-backdrop absolute inset-0 animate-fade-in"
            onClick={onMobileClose}
            aria-label="Close navigation overlay"
          />
          <SidebarShell collapsed={false} isMobile className="absolute inset-y-0 left-0 animate-slide-right shadow-2xl">
            <SidebarHeader
              onMobileClose={onMobileClose}
              showClose
              showCollapseControl={false}
            />
            <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-1">
              <SidebarNav {...navProps} />
            </div>
            <SidebarFooter currentPage={currentPage} onNavigate={handleNavigate} />
          </SidebarShell>
        </div>
      ) : null}
    </>
  );
}

export default function AppSidebar(props) {
  const { mobileOpen, onMobileClose } = props;

  return (
    <SidebarProvider
      mobileOpen={mobileOpen}
      onMobileOpenChange={(open) => {
        if (!open) onMobileClose?.();
      }}
    >
      <AppSidebarInner {...props} />
    </SidebarProvider>
  );
}
