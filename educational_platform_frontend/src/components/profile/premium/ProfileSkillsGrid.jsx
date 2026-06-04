import { Progress } from '@/components/ui/progress';

export default function ProfileSkillsGrid({ skillsDetailed = [], skills = [] }) {
  const detailed = skillsDetailed
    .map((s) => ({
      name: s?.name,
      level:
        s?.level != null && !Number.isNaN(Number(s.level))
          ? Number(s.level) > 10
            ? Math.min(100, Math.round(Number(s.level)))
            : Math.min(100, Math.round(Number(s.level) * 10))
          : null,
    }))
    .filter((s) => s.name);

  if (!detailed.length && !skills.length) return null;

  const tagSkills = skills
    .map((s) => (typeof s === 'string' ? s : s?.name))
    .filter(Boolean)
    .filter((name) => !detailed.find((d) => d.name === name));

  /* Tag-only view when no detailed skills */
  if (!detailed.length) {
    return (
      <div className="flex flex-wrap gap-2">
        {tagSkills.map((name) => (
          <span
            key={name}
            className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary/[0.08] hover:text-primary"
          >
            {name}
          </span>
        ))}
      </div>
    );
  }

  const TOP_COUNT = 4;
  const topDetailed = detailed.slice(0, TOP_COUNT);
  const restDetailed = detailed.slice(TOP_COUNT);
  const allTags = [
    ...restDetailed.map((s) => s.name),
    ...tagSkills,
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      {/* Progress-bar view for top skills */}
      {topDetailed.map((s) => (
        <div key={s.name}>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold tracking-tight text-foreground">{s.name}</span>
            {s.level != null ? (
              <span className="shrink-0 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
                {s.level}%
              </span>
            ) : null}
          </div>
          {s.level != null ? (
            <div className="h-2 overflow-hidden rounded-full bg-muted/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-[width] duration-700 ease-out"
                style={{ width: `${s.level}%` }}
              />
            </div>
          ) : null}
        </div>
      ))}

      {/* Tag cloud for remaining skills */}
      {allTags.length > 0 && (
        <div className={`flex flex-wrap gap-2 ${topDetailed.length > 0 ? 'pt-2 border-t border-border/40' : ''}`}>
          {allTags.map((name) => (
            <span
              key={name}
              className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary/[0.08] hover:text-primary"
            >
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
