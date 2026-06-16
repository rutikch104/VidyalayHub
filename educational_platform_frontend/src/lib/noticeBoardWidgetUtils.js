export const NOTICE_BOARD_LIMIT = 5;

export function sortNotices(notices = []) {
  return [...notices].sort((a, b) => {
    if (Boolean(b.is_pinned) !== Boolean(a.is_pinned)) {
      return b.is_pinned ? 1 : -1;
    }
    const da = new Date(a.starts_at || a.created_at || 0).getTime();
    const db = new Date(b.starts_at || b.created_at || 0).getTime();
    return db - da;
  });
}

export function resolveNoticeCategory(notice) {
  if (notice?.source === 'community') {
    return { key: 'community', label: 'Community' };
  }

  const text = `${notice?.title || ''} ${notice?.body || ''}`.toLowerCase();

  if (notice?.is_pinned) {
    return { key: 'important', label: 'Important' };
  }
  if (/\b(urgent|important|mandatory|critical|alert|attention)\b/.test(text)) {
    return { key: 'important', label: 'Important' };
  }
  if (/\b(exam|academic|semester|syllabus|result|grades|course|curriculum|midterm|final exam)\b/.test(text)) {
    return { key: 'academic', label: 'Academic' };
  }
  if (/\b(placement|recruitment|hiring|internship|campus drive|job fair|career)\b/.test(text)) {
    return { key: 'placement', label: 'Placement' };
  }
  if (/\b(event|workshop|seminar|hackathon|fest|conference|meetup)\b/.test(text)) {
    return { key: 'events', label: 'Events' };
  }

  return { key: 'general', label: 'General' };
}

export function formatNoticeDate(notice) {
  const raw = notice?.starts_at || notice?.created_at;
  if (!raw) return 'Recently posted';

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return 'Recently posted';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function resolveNoticeSourceLabel(notice) {
  if (notice?.source === 'community') {
    return notice.community_name || 'Community';
  }
  return notice?.college_name || 'College';
}
