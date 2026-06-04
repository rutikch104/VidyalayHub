import React from 'react';

export default function CollegeAdminPendingBanner({ stats, onReviewStudents, onReviewTeachers }) {
  const students = stats?.pending_student_registrations ?? 0;
  const teachers = stats?.pending_teacher_registrations ?? 0;
  if (!students && !teachers) return null;

  const parts = [];
  if (students) parts.push(`${students} student${students !== 1 ? 's' : ''}`);
  if (teachers) parts.push(`${teachers} teacher${teachers !== 1 ? 's' : ''}`);
  const summary = `${parts.join(' and ')} awaiting approval before they can use the platform.`;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-foreground">Registration approvals</p>
        <p className="text-sm text-muted-foreground">{summary}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {students > 0 ? (
          <button
            type="button"
            onClick={onReviewStudents}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Review students
          </button>
        ) : null}
        {teachers > 0 ? (
          <button
            type="button"
            onClick={onReviewTeachers}
            className="rounded-lg border border-amber-700/30 bg-white px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100"
          >
            Review teachers
          </button>
        ) : null}
      </div>
    </div>
  );
}
