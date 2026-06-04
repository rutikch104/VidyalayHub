// @ts-nocheck
export default function JobSkeleton() {
  return (
    <div className="jobs-card animate-pulse overflow-hidden p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
        <div className="h-14 w-14 shrink-0 rounded-2xl bg-muted sm:h-16 sm:w-16" />
        <div className="flex-1 space-y-3">
          <div className="h-6 w-2/3 max-w-md rounded-lg bg-muted" />
          <div className="h-4 w-1/3 max-w-[180px] rounded-md bg-muted/80" />
          <div className="flex flex-wrap gap-2">
            <div className="h-7 w-24 rounded-lg bg-muted/70" />
            <div className="h-7 w-28 rounded-lg bg-muted/70" />
            <div className="h-7 w-20 rounded-lg bg-muted/70" />
          </div>
          <div className="space-y-2 pt-1">
            <div className="h-3.5 w-full rounded bg-muted/60" />
            <div className="h-3.5 w-4/5 rounded bg-muted/60" />
          </div>
          <div className="flex justify-between border-t border-border/30 pt-4">
            <div className="h-4 w-32 rounded bg-muted/60" />
            <div className="h-9 w-40 rounded-xl bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
