// @ts-nocheck
export default function NotificationListSkeleton({ count = 4 }) {
  return (
    <div className="notif-feed__list" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="notif-item notif-item--skeleton animate-pulse">
          <div className="notif-item__inner">
            <div className="h-4 w-4 shrink-0 rounded bg-muted" />
            <div className="h-11 w-11 shrink-0 rounded-full bg-muted" />
            <div className="notif-item__main flex-1 space-y-2">
              <div className="h-4 w-4/5 max-w-sm rounded bg-muted" />
              <div className="h-3.5 w-2/3 max-w-xs rounded bg-muted/70" />
              <div className="h-3 w-28 rounded bg-muted/50" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
