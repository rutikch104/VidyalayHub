// @ts-nocheck
import { resolveMediaUrl } from '@/services/postService';

export const EVENT_TABS = [
  { id: 'All', label: 'All' },
  { id: 'Upcoming', label: 'Upcoming' },
  { id: 'This Week', label: 'This week' },
  { id: 'This Month', label: 'This month' },
  { id: 'Past', label: 'Past' },
];

export const EVENT_CATEGORIES = [
  'Seminar',
  'Workshop',
  'Hackathon',
  'Conference',
  'Networking',
  'Recruitment',
  'Sports',
  'Cultural',
];

export const EVENT_TYPES = [
  { id: 'seminar', label: 'Seminar' },
  { id: 'workshop', label: 'Workshop' },
  { id: 'hackathon', label: 'Hackathon' },
  { id: 'conference', label: 'Conference' },
  { id: 'networking', label: 'Networking' },
  { id: 'recruitment', label: 'Recruitment' },
];

export function eventImage(ev) {
  const raw = ev?.image_url || ev?.banner_url;
  if (!raw) return null;
  return resolveMediaUrl(raw) || raw;
}

export function formatDisplayDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(`${String(isoDate).slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTimeShort(t) {
  if (!t) return '';
  const parts = String(t).split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] || '0', 10);
  if (Number.isNaN(h)) return t;
  const dt = new Date();
  dt.setHours(h, m, 0, 0);
  return dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function formatTimeRange(start, end) {
  return `${formatTimeShort(start)} – ${formatTimeShort(end)}`;
}

export function isPublicEvent(ev) {
  return ev.visibility === 'global' || ev.visibility_label === 'public';
}

export function isOrganizer(userId, ev) {
  if (!userId || !ev) return false;
  return String(userId) === String(ev.organizer_id || ev.created_by);
}

export const PLACEHOLDER_BANNER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 320"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0ea5e9"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs><rect fill="url(#g)" width="800" height="320"/><text x="400" y="170" text-anchor="middle" fill="white" font-size="42" font-family="system-ui">Event</text></svg>',
  );
