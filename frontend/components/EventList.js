import Link from 'next/link';
import StatusBadge from './StatusBadge';

function day(date) {
  return new Date(date).getDate();
}

export default function EventList({ events }) {
  return (
    <div className="event-list">
      {events.slice(0, 4).map((event) => (
        <Link href={`/events/${event.id}`} className="event-row" key={event.id}>
          <div className="date-box">
            <strong>{day(event.eventDate)}</strong>
            <span>MAI</span>
          </div>
          <div>
            <div className="row-title">{event.title}</div>
            <div className="row-subtitle">
              {event.venue?.name || 'Locație'} • {event.guestsCount} pers.
            </div>
          </div>
          <StatusBadge status={event.status} />
          <span className="row-subtitle">{event.startTime || '18:00'}</span>
        </Link>
      ))}
    </div>
  );
}
