export default function NetworkSkeleton({ count = 6 }) {
  return (
    <div className="net-people-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="home-profile-card home-profile-card--network home-profile-card--lovable home-profile-card--streamlined animate-pulse overflow-hidden"
          aria-hidden
        >
          <div className="home-profile-card__cover home-profile-card__cover--student opacity-60">
            <div className="home-profile-card__cover-pattern opacity-40" />
          </div>
          <div className="home-profile-card__body">
            <div className="home-profile-card__avatar-wrap">
              <div className="home-profile-card__avatar-ring">
                <div className="home-profile-card__avatar-link rounded-full bg-muted" />
              </div>
            </div>
            <div className="home-profile-card__identity">
              <div className="home-profile-card__identity-zone">
                <div className="mx-auto mb-3 h-5 w-2/3 rounded bg-muted" />
                <div className="mx-auto mb-2 h-4 w-4/5 rounded bg-muted" />
                <div className="mx-auto h-3.5 w-3/5 rounded bg-muted" />
              </div>
              <div className="home-profile-card__actions-zone">
                <div className="flex gap-3">
                  <div className="h-11 flex-[1.6] rounded-full bg-muted" />
                  <div className="h-11 flex-1 rounded-full border border-border/40 bg-muted/30" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
