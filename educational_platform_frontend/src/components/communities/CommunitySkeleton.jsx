// @ts-nocheck
export function CommunityCardSkeleton() {
  return (
    <div className="comm-card h-full overflow-hidden">
      <div className="comm-card__cover h-[5.5rem] animate-pulse bg-muted/80" />
      <div className="comm-card__body flex flex-1 flex-col px-5 pb-5">
        <div className="comm-card__avatar-row -mt-7 mb-3">
          <div className="h-[3.75rem] w-[3.75rem] animate-pulse rounded-xl bg-muted ring-[3px] ring-card" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="h-5 w-2/3 animate-pulse rounded-md bg-muted" />
          <div className="min-h-[2.5rem] space-y-2">
            <div className="h-3.5 w-full animate-pulse rounded bg-muted/70" />
            <div className="h-3.5 w-4/5 animate-pulse rounded bg-muted/60" />
          </div>
          <div className="flex gap-2">
            <div className="h-3 w-24 animate-pulse rounded bg-muted/60" />
            <div className="h-3 w-16 animate-pulse rounded bg-muted/60" />
          </div>
        </div>
        <div className="comm-card__footer pt-5">
          <div className="h-10 w-full animate-pulse rounded-[0.625rem] bg-muted/80" />
        </div>
      </div>
    </div>
  );
}

export function CommunityPostSkeleton() {
  return (
    <div className="comm-post-skeleton">
      <div className="comm-post-skeleton__inner">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-36 animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-20 animate-pulse rounded-md bg-muted/70" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-3.5 w-full animate-pulse rounded bg-muted/80" />
          <div className="h-3.5 w-11/12 animate-pulse rounded bg-muted/70" />
        </div>
        <div className="mt-4 flex gap-2 border-t border-border/25 pt-3">
          <div className="h-9 w-16 animate-pulse rounded-lg bg-muted/60" />
          <div className="h-9 w-16 animate-pulse rounded-lg bg-muted/60" />
          <div className="ml-auto h-9 w-20 animate-pulse rounded-lg bg-muted/50" />
        </div>
      </div>
    </div>
  );
}

export function MemberRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5">
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3.5 w-32 animate-pulse rounded-md bg-muted" />
        <div className="h-2.5 w-20 animate-pulse rounded-md bg-muted/70" />
      </div>
      <div className="h-7 w-16 animate-pulse rounded-lg bg-muted/70" />
    </div>
  );
}

export function FeaturedSidebarSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-xl bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-24 animate-pulse rounded-md bg-muted" />
            <div className="h-2.5 w-14 animate-pulse rounded-md bg-muted/70" />
          </div>
        </div>
      ))}
    </div>
  );
}
