import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const ICON_COLORS = {
  violet:  'from-violet-500 to-purple-600',
  indigo:  'from-indigo-500 to-blue-600',
  emerald: 'from-emerald-500 to-teal-600',
  amber:   'from-amber-400 to-orange-500',
  sky:     'from-sky-500 to-cyan-600',
  orange:  'from-orange-400 to-pink-500',
  rose:    'from-rose-500 to-pink-600',
};

/** Section card — matches Lovable ProfilePage SectionCard */
export default function LovableSectionCard({ icon: Icon, title, subtitle, action, children, className, color = 'violet' }) {
  const gradient = ICON_COLORS[color] || ICON_COLORS.violet;
  return (
    <section
      className={cn(
        'premium-profile__section-card group/section rounded-[1.25rem] border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_16px_rgba(0,0,0,0.04)] transition-shadow duration-200 hover:shadow-[0_2px_6px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.05)]',
        className,
      )}
    >
      <header className="flex items-center justify-between border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-3.5">
          {Icon ? (
            <div className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm transition-transform duration-200 group-hover/section:scale-105',
              gradient,
            )}>
              <Icon className="h-4 w-4" strokeWidth={1.9} />
            </div>
          ) : null}
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function LovableEditButton({ onClick, label = 'Edit' }) {
  if (!onClick) return null;
  return (
    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={onClick}>
      <Pencil className="mr-1 h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
