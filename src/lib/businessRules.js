import { prisma } from './prisma.js';
import { ApiError } from './http.js';

function minutes(value) {
  if (!value) return null;
  const [hours, mins] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return null;
  return hours * 60 + mins;
}

function sameCalendarDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  if (aStart == null || aEnd == null || bStart == null || bEnd == null) return true;
  const normalizedAEnd = aEnd <= aStart ? aEnd + 1440 : aEnd;
  const normalizedBEnd = bEnd <= bStart ? bEnd + 1440 : bEnd;
  return aStart < normalizedBEnd && bStart < normalizedAEnd;
}

export async function assertNoVenueConflict({ organizationId, venueId, eventDate, startTime, endTime, ignoreEventId }) {
  const dayStart = new Date(eventDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(eventDate);
  dayEnd.setHours(23, 59, 59, 999);

  const events = await prisma.event.findMany({
    where: {
      organizationId,
      venueId,
      deletedAt: null,
      status: { not: 'cancelled' },
      eventDate: { gte: dayStart, lte: dayEnd },
      ...(ignoreEventId ? { id: { not: ignoreEventId } } : {}),
    },
    select: { id: true, title: true, eventDate: true, startTime: true, endTime: true },
  });

  const candidateStart = minutes(startTime);
  const candidateEnd = minutes(endTime);
  const conflict = events.find((event) => {
    if (!sameCalendarDay(new Date(event.eventDate), new Date(eventDate))) return false;
    return overlaps(candidateStart, candidateEnd, minutes(event.startTime), minutes(event.endTime));
  });

  if (conflict) {
    throw new ApiError(409, 'venue_conflict', 'Exista deja un eveniment in aceasta locatie in intervalul ales.', {
      eventId: conflict.id,
      title: conflict.title,
    });
  }
}
