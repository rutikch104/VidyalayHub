import { Star } from 'lucide-react';
import ProfileCardShell from '@/components/profile/ProfileCardShell';

function ratingFromName(name) {
  let h = 0;
  const s = String(name);
  for (let i = 0; i < s.length; i += 1) h = (h + s.charCodeAt(i) * (i + 1)) % 97;
  return 5 + (h % 6);
}

function normalizeLevel(level, nameForFallback) {
  if (level != null && level !== '' && !Number.isNaN(Number(level))) {
    const n = Number(level);
    if (n > 10) return Math.min(10, Math.max(0, Math.round(n / 10)));
    return Math.min(10, Math.max(0, Math.round(n)));
  }
  return ratingFromName(nameForFallback);
}

export default function SkillsBarsSection({ profileData, onEdit }) {
  const detailed = profileData?.professionalInfo?.skillsDetailed || [];
  const skills = profileData?.professionalInfo?.skills || [];
  const rows =
    detailed.length > 0
      ? detailed.map((s) => ({ name: s.name, level: normalizeLevel(s.level, s.name) }))
      : skills.map((name) => ({ name, level: normalizeLevel(null, name) }));
  if (rows.length === 0) return null;

  return (
    <ProfileCardShell id="profile-skills" title="Skills" icon={Star} onEdit={onEdit} showAdd>
      <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        {rows.map(({ name, level }) => (
          <div key={name}>
            <div className="mb-1 flex justify-between text-[14px]">
              <span className="text-[#374151] dark:text-foreground">{name}</span>
              <span className="text-[13px] text-[#9ca3af]">{level}/10</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#e5e7eb] dark:bg-muted">
              <div
                className="h-full rounded-full bg-[#3b82f6] transition-[width] duration-500"
                style={{ width: `${level * 10}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </ProfileCardShell>
  );
}
