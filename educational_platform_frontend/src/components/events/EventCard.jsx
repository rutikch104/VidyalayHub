// @ts-nocheck
import { MapPin, Clock, Users, Bookmark, Globe, Lock, Star, Trash2, Video, CalendarDays, Building2, Tag } from 'lucide-react';
import { eventImage, formatDisplayDate, formatTimeRange, isPublicEvent, PLACEHOLDER_BANNER } from './eventUtils';

function parseDateBadge(ev) {
  const raw = ev.date || ev.start_date || '';
  const d = raw ? new Date(`${String(raw).slice(0, 10)}T12:00:00`) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return {
    month: d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
    day: d.getDate(),
  };
}

function isPastEvent(ev) {
  const raw = ev.date || ev.start_date || '';
  if (!raw) return false;
  return new Date(`${String(raw).slice(0, 10)}T23:59:59`) < new Date();
}

export default function EventCard({
  event,
  isBookmarked,
  participantStatus,
  isOrganizer,
  onOpen,
  onBookmark,
  onInterested,
  onGoing,
  onDelete,
}) {
  const ev = event;
  const img = eventImage(ev) || PLACEHOLDER_BANNER;
  const pub = isPublicEvent(ev);
  const dateBadge = parseDateBadge(ev);
  const past = isPastEvent(ev);

  return (
    <article className="feature-card group flex flex-col">
      {/* ── Cover image ── */}
      <button
        type="button"
        onClick={() => onOpen(ev)}
        className="relative block w-full overflow-hidden text-left focus-visible:outline-none"
      >
        <div className="aspect-[16/9] overflow-hidden bg-muted">
          <img
            src={img}
            alt=""
            loading="lazy"
            className={[
              'h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]',
              past ? 'brightness-75 saturate-50' : '',
            ].join(' ')}
          />
        </div>

        {/* Gradient — stronger at bottom for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

        {/* Top-left status badges */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {ev.is_featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              <Star className="h-2.5 w-2.5 fill-current" />
              Featured
            </span>
          )}
          <span
            className={[
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm',
              pub ? 'bg-emerald-500/90 text-white' : 'bg-black/60 text-white/90',
            ].join(' ')}
          >
            {pub ? <Globe className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
            {pub ? 'Public' : 'Private'}
          </span>
          {ev.is_online && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-600/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              <Video className="h-2.5 w-2.5" />
              Online
            </span>
          )}
          {past && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white/80">
              Past
            </span>
          )}
        </div>

        {/* Date badge — top right */}
        {dateBadge && (
          <div className="event-date-badge absolute right-3 top-3 min-w-[3rem] text-center">
            <span className="block text-[9px] font-bold uppercase tracking-widest text-amber-600">
              {dateBadge.month}
            </span>
            <span className="block text-xl font-extrabold leading-none text-foreground">
              {dateBadge.day}
            </span>
          </div>
        )}

        {/* Bottom overlay — title + organizer */}
        <div className="absolute bottom-0 left-0 right-14 p-3">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white drop-shadow-sm">
            {ev.title}
          </h3>
          {ev.college_name && (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-white/70">
              <Building2 className="h-3 w-3 shrink-0" />
              {ev.college_name}
            </p>
          )}
        </div>
      </button>

      {/* ── Card body ── */}
      <div className="flex flex-1 flex-col px-4 pt-3.5 pb-4">
        {/* Date & Location */}
        <div className="space-y-1.5">
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span className="leading-snug">
              {formatDisplayDate(ev.date || ev.start_date)}
              {ev.start_time && ` · ${formatTimeRange(ev.start_time, ev.end_time)}`}
            </span>
          </div>
          {ev.location && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-400" />
              <span className="line-clamp-1">{ev.location}</span>
            </div>
          )}
        </div>

        {/* Category chip */}
        {ev.category && (
          <div className="mt-2.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/70 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
              <Tag className="h-2.5 w-2.5" />
              {ev.category}
            </span>
          </div>
        )}

        {/* Spacer pushes footer to bottom */}
        <div className="mt-auto" />

        {/* Attendee stats */}
        <div className="mt-3 flex items-center gap-2.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span>
            <strong className="font-semibold text-foreground">{ev.going_count ?? 0}</strong> going
          </span>
          <span className="text-border" aria-hidden>·</span>
          <span>
            <strong className="font-semibold text-foreground">{ev.interested_count ?? 0}</strong> interested
          </span>
        </div>

        {/* Action footer */}
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/40 pt-3">
          <div className="flex gap-1.5">
            {isOrganizer ? (
              <span className="inline-flex items-center rounded-lg border border-border/50 bg-muted/50 px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground">
                Organizer
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onInterested(ev)}
                  className={[
                    'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-150',
                    participantStatus === 'interested'
                      ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300/60 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30'
                      : 'border border-border/70 text-muted-foreground hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800',
                  ].join(' ')}
                >
                  <Star
                    className={['h-3 w-3', participantStatus === 'interested' ? 'fill-current' : ''].join(' ')}
                  />
                  Interested
                </button>
                <button
                  type="button"
                  onClick={() => onGoing(ev)}
                  className={[
                    'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-150',
                    participantStatus === 'going'
                      ? 'text-white shadow-sm'
                      : 'border border-border/70 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary',
                  ].join(' ')}
                  style={participantStatus === 'going' ? { backgroundImage: 'var(--gradient-primary)' } : undefined}
                >
                  <CalendarDays className="h-3 w-3" />
                  Going
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => onBookmark(ev.id)}
              className={[
                'rounded-lg p-1.5 transition-all duration-150',
                isBookmarked
                  ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400'
                  : 'text-muted-foreground hover:bg-amber-50 hover:text-amber-600',
              ].join(' ')}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark event'}
            >
              <Bookmark className={['h-4 w-4', isBookmarked ? 'fill-current' : ''].join(' ')} />
            </button>
            {isOrganizer && (
              <button
                type="button"
                onClick={() => onDelete(ev)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                aria-label="Delete event"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
