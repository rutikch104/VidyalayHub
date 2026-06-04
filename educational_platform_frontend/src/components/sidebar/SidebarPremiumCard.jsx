import { ChevronRight, Sparkles } from 'lucide-react';

export default function SidebarPremiumCard({ collapsed }) {
  if (collapsed) {
    return (
      <div className="px-2 pb-3">
        <button
          type="button"
          title="Go Premium"
          className="flex h-10 w-full items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[0_6px_20px_hsl(var(--primary)/0.35)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          <Sparkles className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0 px-3 pb-4 pt-1">
      <div className="sidebar-premium-card relative overflow-hidden rounded-2xl p-4 text-white">
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-4 left-4 h-16 w-16 rounded-full bg-white/5" />

        <div className="relative">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-200" />
            </span>
            <h3 className="text-sm font-bold tracking-tight">Go Premium</h3>
          </div>
          <p className="mb-3 text-[11px] leading-relaxed text-white/85">
            Advanced AI tools, analytics, and priority campus support.
          </p>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/15 py-2.5 text-xs font-semibold backdrop-blur-md transition-all hover:bg-white/25 active:scale-[0.98]"
          >
            Upgrade now
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
