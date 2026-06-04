// @ts-nocheck
export default function EventSkeleton() {
  return (
    <div className="feature-card animate-pulse overflow-hidden">
      {/* Image area matches aspect-[16/9] */}
      <div className="aspect-[16/9] bg-muted" />

      <div className="px-4 pt-3.5 pb-4 space-y-2.5">
        {/* Date row */}
        <div className="flex items-center gap-1.5">
          <div className="h-3.5 w-3.5 rounded-full bg-muted/80 shrink-0" />
          <div className="h-3 w-40 rounded bg-muted" />
        </div>
        {/* Location row */}
        <div className="flex items-center gap-1.5">
          <div className="h-3.5 w-3.5 rounded-full bg-muted/80 shrink-0" />
          <div className="h-3 w-28 rounded bg-muted/80" />
        </div>
        {/* Category chip */}
        <div className="h-5 w-16 rounded-full bg-muted/60" />

        {/* Stats row */}
        <div className="mt-1 flex items-center gap-2">
          <div className="h-3 w-20 rounded bg-muted/70" />
          <div className="h-3 w-24 rounded bg-muted/60" />
        </div>

        {/* Action footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <div className="flex gap-1.5">
            <div className="h-7 w-20 rounded-lg bg-muted" />
            <div className="h-7 w-16 rounded-lg bg-muted/80" />
          </div>
          <div className="h-7 w-7 rounded-lg bg-muted/70" />
        </div>
      </div>
    </div>
  );
}
