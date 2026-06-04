const CommentSkeleton = ({ rows = 3 }) => (
  <div className="comment-thread" aria-busy="true" aria-label="Loading comments">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="comment-skeleton-row">
        <div className="h-10 w-10 shrink-0 rounded-full shimmer-surface" />
        <div className="min-w-0 flex-1 space-y-2 pt-1">
          <div className="flex gap-2">
            <div className="h-3.5 w-24 rounded shimmer-surface" />
            <div className="h-3 w-14 rounded shimmer-surface" />
          </div>
          <div className="h-3 w-full rounded shimmer-surface" />
          <div className="h-3 w-[85%] rounded shimmer-surface" />
          <div className="mt-2 flex gap-3">
            <div className="h-3 w-10 rounded shimmer-surface" />
            <div className="h-3 w-12 rounded shimmer-surface" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default CommentSkeleton;
