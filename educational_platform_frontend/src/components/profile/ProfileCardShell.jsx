import { Edit3, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * VidhyalayHub-style white card: border #e5e7eb, rounded-xl, optional edit/add header actions.
 */
export default function ProfileCardShell({
  title,
  icon: Icon,
  subtitle,
  children,
  className,
  onEdit,
  showAdd,
  id,
}) {
  return (
    <section id={id} className={cn('scroll-mt-24', className)}>
      <div className="rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-sm transition-all duration-200 hover:border-[#d1d5db] hover:shadow-md dark:border-border dark:bg-card sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-[17px] font-bold leading-tight text-[#111827] dark:text-foreground">
              {Icon ? (
                <span className="text-muted-foreground [&>svg]:h-[18px] [&>svg]:w-[18px]">
                  <Icon strokeWidth={1.75} />
                </span>
              ) : null}
              {title}
            </h3>
            {subtitle ? <p className="mt-1 text-[13px] text-[#6b7280] dark:text-muted-foreground">{subtitle}</p> : null}
          </div>
          <div className="flex shrink-0 gap-1">
            {onEdit ? (
              <button
                type="button"
                onClick={onEdit}
                className="rounded-lg p-1.5 text-[#9ca3af] transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Edit section"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            ) : null}
            {showAdd ? (
              <button
                type="button"
                className="rounded-lg p-1.5 text-[#9ca3af] transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Add item"
              >
                <Plus className="h-[18px] w-[18px]" />
              </button>
            ) : null}
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}
