const FeedSkeleton = () => (
  <div className="space-y-4" aria-busy="true" aria-label="Loading posts">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="social-feed-card"
      >
        <div className="flex animate-pulse gap-4">
          <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-muted to-muted/60" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-4 w-28 rounded-md bg-muted" />
              <div className="h-3 w-16 rounded-md bg-muted" />
            </div>
            <div className="h-3 w-full rounded-md bg-muted" />
            <div className="h-3 w-[92%] rounded-md bg-muted" />
            <div className="h-3 w-[70%] rounded-md bg-muted" />
            <div className="mt-4 flex gap-4 border-t border-border pt-4">
              <div className="h-8 w-16 rounded-lg bg-muted" />
              <div className="h-8 w-16 rounded-lg bg-muted" />
              <div className="h-8 w-16 rounded-lg bg-muted" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);
export default FeedSkeleton;
