import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import SidebarNavItem from './SidebarNavItem';
import { SIDEBAR_FOOTER_ITEMS, isNavPageActive } from './navConfig';
import { useSidebar } from './SidebarProvider';

function userDisplayName(user) {
  if (!user) return 'Guest';
  const n = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return n || user.email?.split('@')[0] || 'User';
}

function userInitials(user) {
  const name = userDisplayName(user);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function SidebarFooter({ currentPage, onNavigate }) {
  const { user } = useAuth();
  const { collapsed } = useSidebar();

  const email = user?.email || '';
  const name = useMemo(() => userDisplayName(user), [user]);
  const initials = useMemo(() => userInitials(user), [user]);

  return (
    <footer className="sidebar-footer shrink-0 border-t border-sidebar-border/70 p-2">
      {SIDEBAR_FOOTER_ITEMS.map((item) => (
        <SidebarNavItem
          key={item.page}
          {...item}
          active={isNavPageActive(currentPage, item.page)}
          collapsed={collapsed}
          onClick={() => onNavigate?.(item.page)}
        />
      ))}

      {!collapsed ? (
        <div className="sidebar-footer__user mt-2 rounded-lg border border-sidebar-border/70 bg-sidebar-accent/30 p-2">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[var(--primary-glow)] text-[11px] font-bold text-primary-foreground"
              aria-hidden
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold tracking-tight text-sidebar-foreground">
                {name}
              </p>
              {email ? (
                <p className="truncate text-[10.5px] text-sidebar-foreground/55">{email}</p>
              ) : null}
            </div>
            <span className="sidebar-footer__online relative flex h-2 w-2 shrink-0" title="Online" aria-hidden>
              <span className="absolute inset-0 rounded-full bg-emerald-500/30 blur-[2px]" />
              <span className="relative h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-sidebar" />
            </span>
          </div>
        </div>
      ) : (
        <div
          className="sidebar-footer__user-collapsed mx-auto mt-2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[var(--primary-glow)] text-[10px] font-bold text-primary-foreground"
          title={name}
        >
          {initials}
        </div>
      )}
    </footer>
  );
}
