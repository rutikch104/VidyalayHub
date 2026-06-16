// @ts-nocheck
export function CommunityCardSkeleton() {
  return (
    <div className="comm-card-skeleton--lovable h-full" aria-hidden>
      <div className="comm-card-skeleton__hero" />
      <div className="comm-card-skeleton__body">
        <div className="comm-card-skeleton__logo" />
        <div className="comm-card-skeleton__line comm-card-skeleton__line--sm" />
        <div className="comm-card-skeleton__line comm-card-skeleton__line--title" />
        <div className="comm-card-skeleton__line comm-card-skeleton__line--desc" />
        <div className="comm-card-skeleton__stats comm-card-skeleton__pill" />
        <div className="comm-card-skeleton__actions">
          <div className="comm-card-skeleton__btn" />
          <div className="comm-card-skeleton__btn comm-card-skeleton__btn--view" />
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
