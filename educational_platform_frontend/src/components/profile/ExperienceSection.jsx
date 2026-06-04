import { Briefcase } from 'lucide-react';
import ProfileCardShell from '@/components/profile/ProfileCardShell';

export default function ExperienceSection({ profileData, onEdit }) {
  const company = profileData?.professionalInfo?.company;
  const position = profileData?.professionalInfo?.position;
  const experience = profileData?.professionalInfo?.experience;

  if (!company && !position && !experience) return null;

  return (
    <ProfileCardShell
      id="profile-experience"
      title="Experience"
      icon={Briefcase}
      onEdit={onEdit}
      showAdd
    >
      <div className="flex gap-3 border-b border-[#f3f4f6] pb-4 last:border-0 last:pb-0 dark:border-border/60">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#dbeafe] dark:bg-sky-950/40">
          <Briefcase className="h-[18px] w-[18px] text-[#3b82f6]" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          {position ? <h4 className="text-[15px] font-semibold text-[#111827] dark:text-foreground">{position}</h4> : null}
          {company ? <p className="text-[14px] text-[#6b7280]">{company}</p> : null}
          {experience ? (
            <p className="mt-2 text-[14px] leading-relaxed text-[#4b5563] dark:text-muted-foreground">{experience}</p>
          ) : null}
        </div>
      </div>
    </ProfileCardShell>
  );
}
