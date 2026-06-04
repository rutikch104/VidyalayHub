import { cn } from '@/lib/utils';

export default function SidebarSection({ label, collapsed, children, className, showDivider = false }) {
  return (
    <div className={cn('sidebar-section', className)}>
      {showDivider ? (
        <div className="my-1.5 h-px bg-sidebar-border/60" aria-hidden />
      ) : null}
      {!collapsed && label ? (
        <p className="sidebar-section-label px-3 pb-1.5 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45">
          {label}
        </p>
      ) : null}
      <nav className={cn('flex flex-col gap-0.5 px-1', collapsed && 'items-center')} aria-label={label}>
        {children}
      </nav>
    </div>
  );
}
