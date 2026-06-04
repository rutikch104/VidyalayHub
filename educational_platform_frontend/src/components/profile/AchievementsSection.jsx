import { Trophy, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { profileDesign } from '@/components/profile/profileStyles';

export default function AchievementsSection({ achievements }) {
  const list = Array.isArray(achievements) ? achievements : [];
  const items = list
    .map((a) => {
      if (typeof a === 'string') return { label: a };
      return {
        label: a?.title || a?.description || a?.name || '',
        sub: a?.description && a?.title ? a.description : null,
      };
    })
    .filter((x) => x.label);

  return (
    <section id="profile-achievements" className="scroll-mt-24">
      <div className={cn(profileDesign.card, profileDesign.cardHover)}>
        <div className={cn(profileDesign.sectionHeader, 'sm:mb-6')}>
          <div className={profileDesign.sectionHeaderLeft}>
            <div className={profileDesign.sectionIconBox}>
              <Trophy className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h2 className={profileDesign.sectionTitle}>Achievements</h2>
              <p className={profileDesign.sectionSubtitle}>Recognition and milestones</p>
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div className={profileDesign.emptyState}>
            <Medal className="mx-auto mb-3 h-10 w-10 text-neutral-300 dark:text-muted-foreground" strokeWidth={1.5} />
            <p className="text-sm font-bold text-neutral-800 dark:text-foreground">No achievements yet</p>
            <p className={cn(profileDesign.body, 'mt-2')}>Add accomplishments to stand out.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item, i) => (
              <li
                key={i}
                className="flex gap-4 rounded-xl border border-neutral-100 bg-neutral-50/60 p-4 transition-all duration-200 hover:border-primary/20 hover:bg-white hover:shadow-sm dark:border-border/50 dark:bg-muted/15 dark:hover:bg-muted/30"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Medal className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-bold text-neutral-800 dark:text-foreground">{item.label}</p>
                  {item.sub ? (
                    <p className={cn(profileDesign.body, 'mt-1')}>{item.sub}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
