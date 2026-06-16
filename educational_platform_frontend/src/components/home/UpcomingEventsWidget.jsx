import { CalendarDays, ChevronRight, Loader2 } from 'lucide-react';
import UpcomingEventCard from '@/components/home/UpcomingEventCard';
import {
  sortUpcomingEvents,
  UPCOMING_EVENTS_LIMIT,
} from '@/lib/upcomingEventsWidgetUtils';

function EventsSkeleton() {
  return (
    <div className="upcoming-events-widget__skeleton" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="upcoming-events-widget__skeleton-row" />
      ))}
    </div>
  );
}

function EventsEmptyState({ onBrowse }) {
  return (
    <div className="upcoming-events-widget__empty">
      <div className="upcoming-events-widget__empty-icon">
        <CalendarDays className="h-6 w-6" aria-hidden />
      </div>
      <p className="upcoming-events-widget__empty-title">No upcoming events</p>
      <p className="upcoming-events-widget__empty-text">
        Campus workshops, seminars, and meetups will appear here when scheduled.
      </p>
      <button type="button" onClick={onBrowse} className="upcoming-events-widget__empty-cta">
        Browse events
      </button>
    </div>
  );
}

export default function UpcomingEventsWidget({
  events = [],
  loading = false,
  total = 0,
  onNavigate,
  onViewEvent,
}) {
  const sorted = sortUpcomingEvents(events).slice(0, UPCOMING_EVENTS_LIMIT);
  const showViewAll = total > UPCOMING_EVENTS_LIMIT || events.length > UPCOMING_EVENTS_LIMIT;

  const handleViewAll = () => onNavigate?.('events');

  const handleViewEvent = (event) => {
    if (onViewEvent) {
      onViewEvent(event);
      return;
    }
    onNavigate?.('events');
  };

  if (loading) {
    return (
      <div className="upcoming-events-widget">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" aria-label="Loading events" />
        </div>
        <EventsSkeleton />
      </div>
    );
  }

  if (sorted.length === 0) {
    return <EventsEmptyState onBrowse={handleViewAll} />;
  }

  return (
    <div className="upcoming-events-widget">
      <div className="upcoming-events-widget__list">
        {sorted.map((event) => (
          <UpcomingEventCard
            key={event.id}
            event={event}
            onView={handleViewEvent}
          />
        ))}
      </div>

      {showViewAll ? (
        <button
          type="button"
          onClick={handleViewAll}
          className="upcoming-events-widget__view-all"
        >
          View all events
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
