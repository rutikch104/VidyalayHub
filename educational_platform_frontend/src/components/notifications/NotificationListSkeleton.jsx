// @ts-nocheck
export default function NotificationListSkeleton({ count = 4 }) {
  return (
    <div className="notif-feed__list" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="notif-item notif-item--skeleton animate-pulse">
          <div className="notif-item__inner">
            <div className="notif-item__leading">
              <div className="h-4 w-4 rounded bg-muted" />
              <div className="h-12 w-12 rounded-2xl bg-muted" />
            </div>
            <div className="flex-1 space-y-3 py-0.5">
              <div className="flex justify-between gap-4">
                <div className="h-3 w-20 rounded-full bg-muted/80" />
                <div className="h-3 w-12 rounded-full bg-muted/60" />
              </div>
              <div className="h-5 w-3/5 max-w-xs rounded-lg bg-muted" />
              <div className="space-y-2">
                <div className="h-3.5 w-full rounded bg-muted/60" />
                <div className="h-3.5 w-4/5 rounded bg-muted/60" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
