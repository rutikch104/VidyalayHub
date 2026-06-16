import { formatTimeShort } from '@/components/events/eventUtils';

export const UPCOMING_EVENTS_LIMIT = 5;

export function eventDateTimeKey(ev) {
  const date = String(ev?.date || ev?.start_date || '').slice(0, 10);
  if (!date) return '';
  const time = String(ev?.start_time || '00:00:00').slice(0, 8);
  return `${date}T${time}`;
}

export function sortUpcomingEvents(events = []) {
  return [...events].sort((a, b) => {
    const ka = eventDateTimeKey(a);
    const kb = eventDateTimeKey(b);
    if (!ka && !kb) return 0;
    if (!ka) return 1;
    if (!kb) return -1;
    return ka.localeCompare(kb);
  });
}

export function parseEventDateBadge(ev) {
  const raw = ev?.date || ev?.start_date || '';
  const d = raw ? new Date(`${String(raw).slice(0, 10)}T12:00:00`) : null;
  if (!d || Number.isNaN(d.getTime())) {
    return { month: '—', day: '—', weekday: '', fullDate: 'Date TBD' };
  }

  return {
    month: d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
    day: String(d.getDate()),
    weekday: d.toLocaleDateString(undefined, { weekday: 'short' }),
    fullDate: d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
  };
}

export function formatEventTimeLabel(ev) {
  const start = ev?.start_time ? formatTimeShort(ev.start_time) : '';
  const end = ev?.end_time ? formatTimeShort(ev.end_time) : '';
  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  return 'Time TBD';
}

export function resolveEventLocation(ev) {
  if (ev?.is_online) return 'Online Event';
  const loc = ev?.location?.trim();
  return loc || null;
}

export function resolveEventOrganizer(ev) {
  return (
    ev?.organizer_name?.trim() ||
    ev?.organizer?.name?.trim() ||
    ev?.college_name?.trim() ||
    null
  );
}
