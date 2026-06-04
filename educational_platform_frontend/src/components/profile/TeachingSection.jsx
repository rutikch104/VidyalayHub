import { BookOpen, Calendar } from 'lucide-react';
import ProfileCardShell from '@/components/profile/ProfileCardShell';
import TagList from '@/components/profile/TagList';

const statGreen =
  'rounded-lg border border-emerald-100 bg-[#f0fdf4] px-3 py-3 text-center dark:border-emerald-900/30 dark:bg-emerald-950/20';

export default function TeachingSection({ profileData, onEdit }) {
  if (profileData?.userType !== 'teacher') return null;

  const dept = profileData.academicInfo?.department || profileData.professionalInfo?.position;
  const position = profileData.professionalInfo?.position;
  const joined =
    profileData.joinedAt &&
    new Date(profileData.joinedAt).getFullYear?.() &&
    String(new Date(profileData.joinedAt).getFullYear());
  const skills = profileData.professionalInfo?.skills || [];

  const expertise = skills.slice(0, 6);
  const research = skills.slice(6, 9);

  return (
    <ProfileCardShell
      id="profile-teaching"
      title="Teaching information"
      subtitle="Academic and research details"
      icon={BookOpen}
      onEdit={onEdit}
    >
      <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {dept ? (
          <div className={statGreen}>
            <p className="text-[12px] text-[#9ca3af]">Department</p>
            <p className="mt-0.5 text-[15px] font-semibold text-[#111827] dark:text-foreground">{dept}</p>
          </div>
        ) : null}
        {position ? (
          <div className={statGreen}>
            <p className="text-[12px] text-[#9ca3af]">Position</p>
            <p className="mt-0.5 text-[15px] font-semibold text-[#111827] dark:text-foreground">{position}</p>
          </div>
        ) : null}
        {joined ? (
          <div className={statGreen}>
            <p className="text-[12px] text-[#9ca3af]">Joined</p>
            <p className="mt-0.5 text-[15px] font-semibold text-[#111827] dark:text-foreground">{joined}</p>
          </div>
        ) : null}
      </div>

      {expertise.length > 0 ? (
        <div className="mt-4">
          <h4 className="mb-2 text-sm font-semibold text-[#111827] dark:text-foreground">Areas of expertise</h4>
          <TagList tags={expertise} variant="green" />
        </div>
      ) : null}

      {research.length > 0 ? (
        <div className="mt-4">
          <h4 className="mb-2 text-sm font-semibold text-[#111827] dark:text-foreground">Research areas</h4>
          <TagList tags={research} variant="blue" />
        </div>
      ) : null}

      {skills.length > 9 ? (
        <div className="mt-4">
          <h4 className="mb-2 text-sm font-semibold text-[#111827] dark:text-foreground">Courses taught</h4>
          <TagList tags={skills.slice(9)} variant="indigo" />
        </div>
      ) : null}

      {profileData.professionalInfo?.experience ? (
        <div className="mt-4">
          <h4 className="mb-2 text-sm font-semibold text-[#111827] dark:text-foreground">Bio & focus</h4>
          <p className="text-[14px] leading-relaxed text-[#374151] dark:text-muted-foreground">
            {profileData.professionalInfo.experience}
          </p>
        </div>
      ) : null}

      <div className="mt-5 rounded-lg border border-dashed border-border/80 bg-[#f9fafb] px-4 py-6 text-center text-sm text-muted-foreground dark:bg-muted/30">
        <Calendar className="mx-auto mb-2 h-8 w-8 opacity-40" />
        Office hours and lecture schedule can be managed from your department portal.
      </div>
    </ProfileCardShell>
  );
}
