import { FileText, Heart, Users, Sparkles } from 'lucide-react';
import { pp } from '@/components/profile/premium/profileTokens';
import { cn } from '@/lib/utils';

const ICONS = {
  posts: FileText,
  connections: Users,
  likes: Heart,
  strength: Sparkles,
};

export default function ProfileStatGrid({ stats, completion = 0 }) {
  const items = [
    { key: 'posts', label: 'Posts', value: stats?.posts ?? 0, accent: 'text-primary' },
    { key: 'connections', label: 'Connections', value: stats?.connections ?? stats?.followers ?? 0, accent: 'text-violet-600 dark:text-violet-400' },
    { key: 'likes', label: 'Engagement', value: stats?.likes ?? 0, accent: 'text-rose-600 dark:text-rose-400' },
    { key: 'strength', label: 'Profile', value: `${completion}%`, accent: 'text-emerald-600 dark:text-emerald-400', raw: true },
  ];

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(({ key, label, value, accent, raw }) => {
        const Icon = ICONS[key];
        return (
          <div key={key} className={pp.statCard}>
            <div className={pp.statGlow} aria-hidden />
            <div className="relative flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className={cn('premium-profile__stat-value mt-1 text-2xl font-bold text-foreground', accent)}>
                  {raw ? value : Number(value).toLocaleString()}
                </p>
              </div>
              {Icon ? (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
