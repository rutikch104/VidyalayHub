import { pp } from '@/components/profile/premium/profileTokens';
import { cn } from '@/lib/utils';

export default function ProfileEmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className={pp.empty}>
      {Icon ? (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/[0.12] via-accent/10 to-primary/[0.08] text-primary ring-1 ring-primary/10">
          <Icon className="h-6 w-6" strokeWidth={1.75} />
        </div>
      ) : null}
      <h4 className="text-sm font-semibold tracking-tight text-foreground">{title}</h4>
      {description ? (
        <p className={cn('mt-1.5 max-w-sm text-center text-sm leading-relaxed text-muted-foreground')}>{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
