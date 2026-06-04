import { Award } from 'lucide-react';
import ProfileCardShell from '@/components/profile/ProfileCardShell';

export default function CertificationsSection({ profileData, onEdit }) {
  const raw = profileData?.professionalInfo?.certifications;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  if (list.length === 0) return null;

  return (
    <ProfileCardShell
      id="profile-certifications"
      title="Licenses & certifications"
      icon={Award}
      onEdit={onEdit}
      showAdd
    >
      <div className="space-y-0">
        {list.map((c, i) => {
          const title = typeof c === 'string' ? c : c?.title || c?.name || '';
          const org = typeof c === 'object' ? c?.issuer || c?.org : '';
          if (!title) return null;
          return (
            <div
              key={`${title}-${i}`}
              className="flex gap-3 border-b border-[#f3f4f6] py-3.5 last:border-0 dark:border-border/60"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f3f4f6] dark:bg-muted">
                <Award className="h-[18px] w-[18px] text-[#6b7280]" strokeWidth={1.75} />
              </div>
              <div>
                <h4 className="text-[15px] font-semibold text-[#111827] dark:text-foreground">{title}</h4>
                {org ? <p className="text-[14px] text-[#6b7280]">{org}</p> : null}
                <button type="button" className="mt-1 text-[13px] font-medium text-[#3b82f6] hover:underline">
                  See credential
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ProfileCardShell>
  );
}
