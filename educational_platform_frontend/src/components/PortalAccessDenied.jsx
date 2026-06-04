import { ShieldOff } from 'lucide-react';

export default function PortalAccessDenied({
  title = 'Access restricted',
  message = 'You do not have permission to view this area. Contact your college administrator if you need access.',
  onGoHome,
}) {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center p-8">
      <div className="max-w-lg rounded-2xl border border-border/60 bg-card p-8 text-center shadow-professional ring-1 ring-black/[0.03]">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
          <ShieldOff className="h-6 w-6" aria-hidden />
        </div>
        <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message}</p>
        {onGoHome ? (
          <button
            type="button"
            onClick={onGoHome}
            className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-95"
          >
            Back to home
          </button>
        ) : null}
      </div>
    </div>
  );
}
