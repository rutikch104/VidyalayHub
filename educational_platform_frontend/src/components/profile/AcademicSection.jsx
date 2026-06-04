import { GraduationCap } from 'lucide-react';
import ProfileCardShell from '@/components/profile/ProfileCardShell';
import TagList from '@/components/profile/TagList';

const statBox = 'rounded-lg bg-[#f9fafb] px-3 py-3 dark:bg-muted/40';

export default function AcademicSection({ profileData, onEdit }) {
  if (profileData?.userType !== 'student') return null;

  const a = profileData?.academicInfo || {};
  const clubs = profileData?.clubs?.length ? profileData.clubs : [];
  const events = profileData?.events?.length ? profileData.events : [];

  const hasGrid =
    a.enrollmentYear != null ||
    a.currentSemester != null ||
    a.gpa != null ||
    a.course ||
    a.department ||
    a.university;

  if (!hasGrid && !clubs.length && !events.length) return null;

  return (
    <ProfileCardShell
      id="profile-academic"
      title="Academic information"
      subtitle="Current academic details and achievements"
      icon={GraduationCap}
      onEdit={onEdit}
    >
      {hasGrid ? (
        <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {a.enrollmentYear != null ? (
            <div className={statBox}>
              <p className="text-[12px] text-[#9ca3af]">Enrollment year</p>
              <p className="mt-0.5 text-[15px] font-semibold text-[#111827] dark:text-foreground">{a.enrollmentYear}</p>
            </div>
          ) : null}
          {a.currentSemester != null ? (
            <div className={statBox}>
              <p className="text-[12px] text-[#9ca3af]">Current semester</p>
              <p className="mt-0.5 text-[15px] font-semibold text-[#111827] dark:text-foreground">{a.currentSemester}</p>
            </div>
          ) : null}
          {a.gpa != null ? (
            <div className={statBox}>
              <p className="text-[12px] text-[#9ca3af]">GPA</p>
              <p className="mt-0.5 text-[15px] font-semibold text-[#111827] dark:text-foreground">{a.gpa}</p>
            </div>
          ) : null}
          {a.course ? (
            <div className={statBox}>
              <p className="text-[12px] text-[#9ca3af]">Course</p>
              <p className="mt-0.5 text-[15px] font-semibold text-[#111827] dark:text-foreground">{a.course}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {clubs.length > 0 ? (
        <div className="mt-4">
          <h4 className="mb-2 text-sm font-semibold text-[#111827] dark:text-foreground">Clubs & activities</h4>
          <TagList tags={clubs} variant="blue" />
        </div>
      ) : null}

      {events.length > 0 ? (
        <div className="mt-4">
          <h4 className="mb-2 text-sm font-semibold text-[#111827] dark:text-foreground">Events participated</h4>
          <TagList tags={events} variant="amber" />
        </div>
      ) : null}
    </ProfileCardShell>
  );
}
