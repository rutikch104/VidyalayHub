import { cn } from '@/lib/utils';

const VALUE_CLASS = {
  violet: 'text-violet-700 dark:text-violet-300',
  sky: 'text-sky-700 dark:text-sky-300',
  amber: 'text-amber-800 dark:text-amber-300',
  emerald: 'text-emerald-700 dark:text-emerald-300',
  slate: 'text-slate-700 dark:text-slate-300',
};

/**
 * Premium stat strip — matches Library / Jobs with per-module color identity.
 */
export default function ModuleStatsGrid({ items = [], theme = 'sky', className }) {
  if (!items.length) return null;

  const valueClass = VALUE_CLASS[theme] || VALUE_CLASS.sky;

  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-4', className)}>
      {items.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className={cn('platform-stat', `platform-stat--${theme}`)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="platform-stat__label">{label}</p>
              <p className={cn('platform-stat__value', valueClass)}>{value ?? 0}</p>
            </div>
            {Icon ? (
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/[0.04]',
                  `platform-stat__icon-wrap platform-stat__icon-wrap--${theme}`,
                )}
                aria-hidden
              >
                <Icon className={cn('h-[18px] w-[18px]', valueClass)} strokeWidth={2} />
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
