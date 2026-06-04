import { GraduationCap } from 'lucide-react';
import ProfileCardShell from '@/components/profile/ProfileCardShell';

export default function EducationSection({ profileData, onEdit }) {
  const a = profileData?.academicInfo || {};
  const uni = a.university;
  const course = a.course;
  const start = a.enrollmentYear;
  const end = a.graduationYear;

  if (!uni && !course) return null;

  const range =
    start && end ? `${start} – ${end}` : start ? `Started ${start}` : end ? `Class of ${end}` : null;

  return (
    <ProfileCardShell id="profile-education" title="Education" icon={GraduationCap} onEdit={onEdit} showAdd>
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#dbeafe] dark:bg-sky-950/40">
          <GraduationCap className="h-[18px] w-[18px] text-[#3b82f6]" strokeWidth={1.75} />
        </div>
        <div>
          {uni ? <h4 className="text-[15px] font-semibold text-[#111827] dark:text-foreground">{uni}</h4> : null}
          {course ? <p className="text-[14px] text-[#6b7280]">{course}</p> : null}
          {range ? <p className="mt-0.5 text-[13px] text-[#9ca3af]">{range}</p> : null}
          {a.department ? (
            <p className="mt-2 text-[14px] leading-relaxed text-[#4b5563] dark:text-muted-foreground">
              {a.department}
            </p>
          ) : null}
        </div>
      </div>
    </ProfileCardShell>
  );
}
