import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pp } from '@/components/profile/premium/profileTokens';

/**
 * Section card matching premium-profile-bliss SectionCard pattern.
 */
export default function BlissSectionCard({
  icon: Icon,
  title,
  actionLabel = 'Edit',
  onAction,
  children,
  className,
}) {
  return (
    <section className={cn(pp.sectionCard, className)}>
      <header className={pp.sectionHeader}>
        <div className="flex items-start gap-3">
          {Icon ? (
            <div className={pp.sectionIconBox}>
              <Icon className="h-4 w-4" strokeWidth={2} />
            </div>
          ) : null}
          <h2 className="pt-0.5 text-[0.9375rem] font-semibold tracking-tight text-foreground sm:text-base">{title}</h2>
        </div>
        {onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
            {actionLabel}
          </button>
        ) : null}
      </header>
      <div className={pp.sectionBody}>{children}</div>
    </section>
  );
}
