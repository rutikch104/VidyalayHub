import { cn } from '@/lib/utils';

const VARIANT_CLASS = {
  sky: 'platform-hero--sky',
  violet: 'platform-hero--violet',
  emerald: 'platform-hero--emerald',
  amber: 'platform-hero--amber',
  slate: 'platform-hero--slate',
};

const CTA_COLOR = {
  sky: 'text-sky-700 hover:bg-sky-50',
  violet: 'text-violet-700 hover:bg-violet-50',
  emerald: 'text-emerald-700 hover:bg-emerald-50',
  amber: 'text-amber-800 hover:bg-amber-50',
  slate: 'text-slate-800 hover:bg-slate-100',
};

/**
 * Premium module hero — Jobs, Events, Communities, Library, etc.
 */
export default function PageHeader({
  icon: Icon,
  badge,
  title,
  description,
  variant = 'sky',
  action,
  actionLabel,
  onAction,
  className,
  children,
}) {
  const variantClass = VARIANT_CLASS[variant] || VARIANT_CLASS.sky;
  const ctaColor = CTA_COLOR[variant] || CTA_COLOR.sky;

  return (
    <header className={cn('platform-hero', variantClass, className)}>
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {badge ? (
            <div className="platform-hero__badge">
              {Icon ? <Icon className="h-3 w-3" strokeWidth={2.4} aria-hidden /> : null}
              {badge}
            </div>
          ) : Icon && !badge ? (
            <div className="platform-hero__badge">
              <Icon className="h-3 w-3" strokeWidth={2.4} aria-hidden />
            </div>
          ) : null}
          <h1 className="platform-hero__title">{title}</h1>
          {description ? <p className="platform-hero__desc">{description}</p> : null}
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
        {action ?? (onAction && actionLabel ? (
          <button
            type="button"
            onClick={onAction}
            className={cn('platform-hero__cta', ctaColor)}
          >
            {actionLabel}
          </button>
        ) : null)}
      </div>
    </header>
  );
}
