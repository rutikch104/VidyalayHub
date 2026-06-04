// @ts-nocheck
import { useEffect } from 'react';
import { X, MapPin, Clock, Users, Globe, Lock, Video, ExternalLink, Star, CalendarDays, Building2, Tag, Loader2 } from 'lucide-react';
import {
  eventImage,
  formatDisplayDate,
  formatTimeRange,
  isPublicEvent,
  PLACEHOLDER_BANNER,
} from './eventUtils';

function isPastEvent(ev) {
  const raw = ev?.date || ev?.start_date || '';
  if (!raw) return false;
  return new Date(`${String(raw).slice(0, 10)}T23:59:59`) < new Date();
}

export default function EventDetailModal({
  event,
  loading,
  onClose,
  participantStatus,
  isOrganizer,
  onInterested,
  onGoing,
}) {
  useEffect(() => {
    if (!event) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [event, onClose]);

  if (!event) return null;

  const img = eventImage(event) || PLACEHOLDER_BANNER;
  const pub = isPublicEvent(event);
  const past = isPastEvent(event);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-card shadow-2xl sm:rounded-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner */}
        <div className="relative shrink-0">
          <div className="h-52 sm:h-60 overflow-hidden bg-muted">
            <img
              src={img}
              alt=""
              className={['h-full w-full object-cover', past ? 'brightness-75 saturate-50' : ''].join(' ')}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Status badges */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {event.is_featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold text-white shadow">
                <Star className="h-3 w-3 fill-current" />
                Featured
              </span>
            )}
            <span
              className={[
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold shadow',
                pub ? 'bg-emerald-500/90 text-white' : 'bg-black/60 text-white/90',
              ].join(' ')}
            >
              {pub ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              {pub ? 'Public — all colleges' : 'Private — your college'}
            </span>
            {event.is_online && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-600/90 px-2.5 py-1 text-[10px] font-bold text-white shadow">
                <Video className="h-3 w-3" />
                Online
              </span>
            )}
            {past && (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold text-white/80">
                Past event
              </span>
            )}
          </div>

          {/* Title over banner */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h2 className="text-xl font-bold text-white drop-shadow-sm sm:text-2xl">
              {event.title}
            </h2>
            {event.college_name && (
              <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-white/75">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                Hosted by {event.college_name}
              </p>
            )}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center gap-2 border-b border-border/50 px-5 py-2.5 text-xs font-medium text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading details…
            </div>
          )}

          <div className="px-5 py-5 space-y-5">
            {/* Metadata grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Date & Time</p>
                  <p className="mt-0.5 text-sm font-medium text-foreground">
                    {formatDisplayDate(event.date || event.start_date)}
                  </p>
                  {event.start_time && (
                    <p className="text-xs text-muted-foreground">
                      {formatTimeRange(event.start_time, event.end_time)}
                    </p>
                  )}
                </div>
              </div>

              {event.location && (
                <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Location</p>
                    <p className="mt-0.5 text-sm font-medium text-foreground">{event.location}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Attendance</p>
                  <p className="mt-0.5 text-sm font-medium text-foreground">
                    <span className="font-bold">{event.going_count ?? 0}</span> going ·{' '}
                    <span className="font-bold">{event.interested_count ?? 0}</span> interested
                  </p>
                </div>
              </div>

              {event.category && (
                <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
                  <Tag className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Category</p>
                    <p className="mt-0.5 text-sm font-medium text-foreground">{event.category}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {event.description && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">About</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                  {event.description}
                </p>
              </div>
            )}

            {/* Meeting link */}
            {event.meeting_link && (
              <a
                href={event.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                <ExternalLink className="h-4 w-4" />
                Join online
              </a>
            )}

            {/* Tags */}
            {(event.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {event.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RSVP footer */}
        {!isOrganizer && !past && (
          <div className="shrink-0 flex gap-2 border-t border-border/50 bg-card px-5 py-4">
            <button
              type="button"
              onClick={() => onInterested(event)}
              className={[
                'flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all duration-150',
                participantStatus === 'interested'
                  ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300/60 dark:bg-amber-500/15 dark:text-amber-300'
                  : 'border border-border hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800',
              ].join(' ')}
            >
              <Star className={['h-4 w-4', participantStatus === 'interested' ? 'fill-current' : ''].join(' ')} />
              {participantStatus === 'interested' ? 'Interested ✓' : 'Interested'}
            </button>
            <button
              type="button"
              onClick={() => onGoing(event)}
              className={[
                'flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all duration-150',
                participantStatus === 'going'
                  ? 'text-white shadow-sm'
                  : 'border border-border hover:border-primary/40 hover:bg-primary/5 hover:text-primary',
              ].join(' ')}
              style={participantStatus === 'going' ? { backgroundImage: 'var(--gradient-primary)' } : undefined}
            >
              <CalendarDays className="h-4 w-4" />
              {participantStatus === 'going' ? 'Going ✓' : 'Going'}
            </button>
          </div>
        )}
        {isOrganizer && (
          <div className="shrink-0 border-t border-border/50 bg-muted/30 px-5 py-3 text-center text-xs font-medium text-muted-foreground">
            You are the organizer of this event
          </div>
        )}
        {past && !isOrganizer && (
          <div className="shrink-0 border-t border-border/50 bg-muted/30 px-5 py-3 text-center text-xs font-medium text-muted-foreground">
            This event has already taken place
          </div>
        )}
      </div>
    </div>
  );
}
