// @ts-nocheck
export default function QuestionSkeleton() {
  return (
    <div className="tc-q-card tc-q-card--skeleton" aria-hidden>
      <header className="tc-q-card__header">
        <div className="tc-q-card__header-row">
          <div className="tc-q-card__author">
            <div className="tc-q-card__skel tc-q-card__skel--avatar" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="tc-q-card__skel tc-q-card__skel--name" />
              <div className="tc-q-card__skel tc-q-card__skel--meta" />
            </div>
          </div>
          <div className="tc-q-card__skel tc-q-card__skel--badge" />
        </div>
      </header>
      <div className="tc-q-card__body">
        <div className="tc-q-card__skel tc-q-card__skel--title" />
        <div className="tc-q-card__skel tc-q-card__skel--line" />
        <div className="tc-q-card__skel tc-q-card__skel--line tc-q-card__skel--short" />
      </div>
      <div className="flex flex-wrap gap-2 px-4 pb-1 sm:px-5">
        <div className="tc-q-card__skel tc-q-card__skel--tag" />
        <div className="tc-q-card__skel tc-q-card__skel--tag" />
      </div>
      <footer className="tc-q-card__footer">
        <div className="tc-q-card__skel tc-q-card__skel--metrics" />
        <div className="tc-q-card__skel tc-q-card__skel--btn" />
      </footer>
    </div>
  );
}
