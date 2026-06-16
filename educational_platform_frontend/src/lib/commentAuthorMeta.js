export function formatCommentRoleBadge(rawType) {
  const t = String(rawType || '').toLowerCase();
  if (!t) return '';
  if (t.includes('alumni')) return 'ALUMNI';
  if (['teacher', 'faculty', 'professor', 'institution', 'admin'].some((k) => t.includes(k))) {
    return 'FACULTY';
  }
  if (t.includes('student')) return 'STUDENT';
  return String(rawType).replace(/_/g, ' ').toUpperCase();
}

export function isVerifiedCommentAuthor(user) {
  const t = String(user?.user_type || user?.role || user?.title || '').toLowerCase();
  return ['teacher', 'faculty', 'admin', 'professor', 'institution', 'super'].some((k) =>
    t.includes(k),
  );
}

/** Secondary metadata line beneath academic identity (time added in UI). */
export function buildCommentMetaParts() {
  return [];
}
