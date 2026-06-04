import { cn } from '@/lib/utils';

/** Collect unique skill names from detailed rows and legacy string list */
export function collectSkillNames(skillsDetailed = [], skills = []) {
  const seen = new Set();
  const add = (name) => {
    const n = String(name || '').trim();
    if (!n) return;
    const key = n.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    return n;
  };

  const out = [];
  for (const s of skillsDetailed) {
    const n = add(s?.name);
    if (n) out.push(n);
  }
  for (const s of skills) {
    const n = add(typeof s === 'string' ? s : s?.name);
    if (n) out.push(n);
  }
  return out;
}

export function SkillChip({ name, className }) {
  return (
    <span className={cn('premium-profile-skill-chip', className)}>
      <span className="premium-profile-skill-chip__label">{name}</span>
    </span>
  );
}

/** Premium skill tags — chip grid only (no duplicate top-skills panel) */
export default function ProfileSkillsGrid({
  skillsDetailed = [],
  skills = [],
  className,
}) {
  const names = collectSkillNames(skillsDetailed, skills);
  if (!names.length) return null;

  return (
    <div className={cn('premium-profile-skills-grid', className)} role="list">
      {names.map((name) => (
        <SkillChip key={name} name={name} />
      ))}
    </div>
  );
}
