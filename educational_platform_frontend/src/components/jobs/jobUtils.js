// @ts-nocheck
import { resolveMediaUrl } from '@/services/postService';

export const JOB_TYPES = [
  { id: 'full-time', label: 'Full-time' },
  { id: 'part-time', label: 'Part-time' },
  { id: 'intern', label: 'Internship' },
  { id: 'contract', label: 'Contract' },
  { id: 'freelance', label: 'Freelance' },
];

export const JOB_SKILLS_MAX = 15;
export const JOB_SKILLS_RECOMMENDED = 10;

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
    junior: '1-2 years',
    'mid-level': '2-5 years',
    mid: 'Mid level',
    senior: '5+ years',
    lead: 'Lead',
    executive: 'Executive',
  };
  return map[level] || String(level).replace(/_/g, ' ');
}

export function companyInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function workModeLabel(job) {
  if (job?.is_remote) return 'Remote';
  return 'On-site';
}

export function isJobNew(job) {
  if (!job?.created_at) return false;
  const diff = Date.now() - new Date(job.created_at).getTime();
  return diff < 7 * 24 * 60 * 60 * 1000;
}

export function formatCompactCount(n) {
  const value = Number(n) || 0;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(value);
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
