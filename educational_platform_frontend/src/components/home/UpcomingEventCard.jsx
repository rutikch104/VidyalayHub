import { ArrowRight, Building2, Clock, MapPin, Video } from 'lucide-react';
import {
  formatEventTimeLabel,
  parseEventDateBadge,
  resolveEventLocation,
  resolveEventOrganizer,
} from '@/lib/upcomingEventsWidgetUtils';

export default function UpcomingEventCard({ event, onView }) {
  const badge = parseEventDateBadge(event);
  const timeLabel = formatEventTimeLabel(event);
  const location = resolveEventLocation(event);
  const organizer = resolveEventOrganizer(event);
  const isOnline = Boolean(event?.is_online);

  return (
    <article className="upcoming-event-card">
      <div className="upcoming-event-card__date" aria-hidden>
        <span className="upcoming-event-card__date-month">{badge.month}</span>
        <span className="upcoming-event-card__date-day">{badge.day}</span>
      </div>

      <div className="upcoming-event-card__body">
        <h4 className="upcoming-event-card__title">{event.title || 'Untitled event'}</h4>

        <p className="upcoming-event-card__datetime">
          <Clock className="upcoming-event-card__meta-icon upcoming-event-card__meta-icon--time" aria-hidden />
          <span>
            {badge.fullDate}
            <span className="upcoming-event-card__datetime-sep" aria-hidden>·</span>
            {timeLabel}
          </span>
        </p>

        {location ? (
          <p className="upcoming-event-card__meta">
            {isOnline ? (
              <Video className="upcoming-event-card__meta-icon upcoming-event-card__meta-icon--online" aria-hidden />
            ) : (
              <MapPin className="upcoming-event-card__meta-icon upcoming-event-card__meta-icon--location" aria-hidden />
            )}
            <span>{location}</span>
          </p>
        ) : null}

        {organizer ? (
          <p className="upcoming-event-card__meta upcoming-event-card__meta--organizer">
            <Building2 className="upcoming-event-card__meta-icon upcoming-event-card__meta-icon--organizer" aria-hidden />
            <span>{organizer}</span>
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => onView?.(event)}
          className="upcoming-event-card__cta"
        >
          View Event
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </article>
  );
}
