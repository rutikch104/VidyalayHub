export default function NetworkSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-[1.25rem] border border-border/40 bg-card/95 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] sm:p-5"
        >
          <div className="flex gap-3">
            <div className="h-14 w-14 rounded-full bg-muted" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-4 w-2/3 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
            </div>
          </div>
          <div className="mt-4 h-3 w-full rounded bg-muted" />
          <div className="mt-2 h-3 w-4/5 rounded bg-muted" />
          <div className="mt-5 flex gap-2">
            <div className="h-8 flex-1 rounded-full bg-muted" />
            <div className="h-8 w-16 rounded-full bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
