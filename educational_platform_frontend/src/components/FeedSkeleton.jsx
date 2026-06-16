const FeedSkeleton = () => (
  <div className="space-y-4" aria-busy="true" aria-label="Loading posts">
    {[0, 1, 2].map((i) => (
      <div key={i} className="social-feed-card feed-post animate-pulse">
        <div className="feed-post__header">
          <div className="feed-post__author-block">
            <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-muted to-muted/60" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-36 rounded-md bg-muted" />
              <div className="h-3 w-52 max-w-full rounded-md bg-muted" />
            </div>
          </div>
          <div className="flex gap-1">
            <div className="h-8 w-8 rounded-lg bg-muted" />
            <div className="h-8 w-8 rounded-lg bg-muted" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3.5 w-full rounded-md bg-muted" />
          <div className="h-3.5 w-[94%] rounded-md bg-muted" />
          <div className="h-3.5 w-[78%] rounded-md bg-muted" />
        </div>
        <div className="mt-4 flex gap-2">
          <div className="h-7 w-16 rounded-full bg-muted" />
          <div className="h-7 w-20 rounded-full bg-muted" />
        </div>
        <div className="feed-post__stats mt-4">
          <div className="h-3 w-14 rounded bg-muted" />
          <div className="h-3 w-20 rounded bg-muted" />
        </div>
        <div className="feed-post__actions">
          {[0, 1, 2, 3].map((j) => (
            <div key={j} className="mx-auto h-8 w-16 rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    ))}
  </div>
);

export default FeedSkeleton;
