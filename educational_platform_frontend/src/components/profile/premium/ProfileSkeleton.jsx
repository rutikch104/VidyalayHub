import { pp } from '@/components/profile/premium/profileTokens';

function Shimmer({ className = '' }) {
  return <div className={`premium-profile__skeleton-shimmer ${className}`} aria-hidden />;
}

export default function ProfileSkeleton() {
  return (
    <div className={pp.page}>
      <div className={pp.pageGlow} aria-hidden />
      <div className={`${pp.container} ${pp.animateIn}`}>
        {/* Header card skeleton — matches LovableProfileHeader structure */}
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
          {/* Cover */}
          <Shimmer className="h-48 sm:h-60 lg:h-[17.75rem]" />

          {/* Sheet: avatar + identity + actions */}
          <div className="bg-card px-5 pb-0 sm:px-7">
            <div
              className="grid items-start gap-x-4 sm:gap-x-5 md:gap-x-6"
              style={{
                gridTemplateColumns: '7rem minmax(0,1fr)',
                marginTop: '-3.5rem',
              }}
            >
              {/* Avatar column */}
              <div className="relative z-10 row-span-2">
                <Shimmer className="h-28 w-28 rounded-full ring-4 ring-card sm:h-32 sm:w-32 md:h-40 md:w-40" />
              </div>

              {/* Actions row */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-7">
                <Shimmer className="h-9 w-24 rounded-full" />
                <Shimmer className="h-9 w-24 rounded-full" />
                <Shimmer className="h-9 w-9 rounded-full" />
                <Shimmer className="h-9 w-9 rounded-full" />
              </div>

              {/* Identity */}
              <div className="space-y-3 pt-2 pb-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Shimmer className="h-7 w-44 rounded-lg" />
                  <Shimmer className="h-5 w-16 rounded-full" />
                </div>
                <Shimmer className="h-4 w-64 max-w-full rounded-md" />
                <div className="flex flex-wrap gap-3">
                  <Shimmer className="h-3.5 w-20 rounded" />
                  <Shimmer className="h-3.5 w-24 rounded" />
                  <Shimmer className="h-3.5 w-20 rounded" />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Shimmer className="h-7 w-16 rounded-full" />
                  <Shimmer className="h-7 w-12 rounded-full" />
                  <Shimmer className="h-7 w-20 rounded-full" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Shimmer className="h-8 w-20 rounded-full" />
                  <Shimmer className="h-8 w-20 rounded-full" />
                  <Shimmer className="h-8 w-20 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Stats strip skeleton — matches header stats row */}
          <div className="grid grid-cols-4 gap-0 border-t border-border/60 px-5 py-4 sm:px-7 sm:py-5">
            {[60, 40, 52, 36].map((w, i) => (
              <div key={i} className="flex flex-col gap-2 px-2 sm:px-4">
                <Shimmer className={`h-6 w-${w === 60 ? 14 : w === 52 ? 12 : w === 40 ? 10 : 8} rounded-md`} />
                <Shimmer className="h-3 w-16 rounded" />
              </div>
            ))}
          </div>

        </div>

        {/* Content grid skeleton */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            {/* Tab bar */}
            <Shimmer className="h-12 rounded-2xl" />
            {/* Section cards */}
            <Shimmer className="h-44 rounded-2xl" />
            <Shimmer className="h-56 rounded-2xl" />
            <Shimmer className="h-36 rounded-2xl" />
          </div>
          {/* Sidebar */}
          <div className="space-y-4">
            <Shimmer className="h-36 rounded-2xl" />
            <Shimmer className="h-48 rounded-2xl" />
            <Shimmer className="h-32 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
