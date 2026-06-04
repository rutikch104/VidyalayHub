// @ts-nocheck
import { resolveMediaUrl } from '@/services/postService';

export const JOB_TYPES = [
  { id: 'full-time', label: 'Full-time' },
  { id: 'part-time', label: 'Part-time' },
  { id: 'intern', label: 'Internship' },
  { id: 'contract', label: 'Contract' },
  { id: 'freelance', label: 'Freelance' },
];

export const JOB_CATEGORIES = [
  { id: 'internship', label: 'Internship' },
  { id: 'full_time', label: 'Full-time role' },
  { id: 'part_time', label: 'Part-time' },
  { id: 'referral', label: 'Referral' },
  { id: 'campus', label: 'Campus drive' },
  { id: 'contract', label: 'Contract' },
  { id: 'freelance', label: 'Freelance' },
];

export function canPostJobs(user) {
  if (!user) return false;
  if (user.is_admin) return true;
  const t = String(user.user_type || '').toLowerCase();
  return t === 'teacher' || t === 'alumni' || t === 'staff';
}

export function jobTitle(job) {
  return job?.title || job?.job_title || 'Untitled role';
}

export function companyLogoUrl(job) {
  const raw = job?.company_logo;
  if (!raw) return null;
  return resolveMediaUrl(raw) || raw;
}

export function formatSalary(salaryRange) {
  if (!salaryRange || typeof salaryRange !== 'object') return null;
  const { min, max, currency, period } = salaryRange;
  const minN = min != null ? Number(min) : null;
  const maxN = max != null ? Number(max) : null;
  if ((minN == null || minN === 0) && (maxN == null || maxN === 0)) return null;
  const cur = currency ? `${currency} ` : '';
  const a = minN != null && minN > 0 ? minN.toLocaleString() : '—';
  const b = maxN != null && maxN > 0 ? maxN.toLocaleString() : '—';
  const per = period ? ` / ${period.replace(/_/g, ' ')}` : '';
  return `${cur}${a} – ${b}${per}`.trim();
}

export function jobTypeLabel(jobType) {
  if (!jobType) return null;
  if (jobType === 'intern') return 'Internship';
  const found = JOB_TYPES.find((t) => t.id === jobType);
  return found?.label || String(jobType).replace(/_/g, ' ');
}

export function experienceLevelLabel(level) {
  if (!level) return null;
  const map = {
    entry: 'Entry level',
    mid: 'Mid level',
    senior: 'Senior',
    executive: 'Executive',
  };
  return map[level] || String(level).replace(/_/g, ' ');
}

export function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateString).toLocaleDateString();
}

export function categoryLabel(cat) {
  const found = JOB_CATEGORIES.find((c) => c.id === cat);
  return found?.label || (cat || '').replace(/_/g, ' ');
}

export function hasApplied(applications, jobId) {
  return (applications || []).some(
    (a) =>
      !a.is_withdrawn &&
      (String(a.job_id) === String(jobId) || String(a.job?.id) === String(jobId)),
  );
}

export function isJobOwner(userId, job) {
  if (!userId || !job) return false;
  return (
    String(userId) === String(job.posted_by) ||
    String(userId) === String(job.poster?.id)
  );
}
