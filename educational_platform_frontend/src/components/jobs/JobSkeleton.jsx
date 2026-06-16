// @ts-nocheck
export default function JobSkeleton() {
  return (
    <div className="jobs-card-skeleton" aria-hidden>
      <div className="jobs-card-skeleton__inner">
        <div className="jobs-card-skeleton__logo" />
        <div className="jobs-card-skeleton__content">
          <div className="jobs-card-skeleton__line jobs-card-skeleton__line--title" />
          <div className="jobs-card-skeleton__line jobs-card-skeleton__line--sub" />
          <div className="jobs-card-skeleton__pills">
            <div className="jobs-card-skeleton__pill" />
            <div className="jobs-card-skeleton__pill" />
            <div className="jobs-card-skeleton__pill" />
            <div className="jobs-card-skeleton__pill" />
          </div>
          <div className="jobs-card-skeleton__footer">
            <div className="jobs-card-skeleton__line jobs-card-skeleton__line--stat" />
            <div className="jobs-card-skeleton__actions">
              <div className="jobs-card-skeleton__btn" />
              <div className="jobs-card-skeleton__btn jobs-card-skeleton__btn--primary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
