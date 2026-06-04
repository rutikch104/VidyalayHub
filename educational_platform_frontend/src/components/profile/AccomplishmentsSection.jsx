import { Award, CheckCircle } from 'lucide-react';
import ProfileCardShell from '@/components/profile/ProfileCardShell';

export default function AccomplishmentsSection({ achievements, onEdit }) {
  const list = Array.isArray(achievements) ? achievements : [];
  const lines = list
    .map((a) => (typeof a === 'string' ? a : a?.title || a?.description || ''))
    .filter(Boolean);

  if (lines.length === 0) return null;

  return (
    <ProfileCardShell id="profile-accomplishments" title="Accomplishments" icon={Award} onEdit={onEdit}>
      <ul className="space-y-3">
        {lines.map((text, i) => (
          <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-[#374151] dark:text-muted-foreground">
            <CheckCircle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#22c55e]" strokeWidth={1.75} />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </ProfileCardShell>
  );
}
