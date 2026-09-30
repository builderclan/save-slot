import { Event, Venue, ConflictReport, VenueConflict, ScheduleOverlap } from "@/types/database";
import { parseISO, areIntervalsOverlapping, format } from "date-fns";

export interface CheckConflictParams {
  eventId?: string; // If editing an existing event, exclude it from self-conflict
  venueId?: string | null;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  existingEvents: Event[];
  venues?: Venue[];
}

export function detectConflicts({
  eventId,
  venueId,
  startTime,
  endTime,
  existingEvents,
  venues = [],
}: CheckConflictParams): ConflictReport {
  const venueConflicts: VenueConflict[] = [];
  const scheduleOverlaps: ScheduleOverlap[] = [];

  try {
    const proposedStart = parseISO(startTime);
    const proposedEnd = parseISO(endTime);

    // If proposed interval is invalid, return empty
    if (proposedStart >= proposedEnd) {
      return {
        hasVenueConflict: false,
        hasScheduleOverlap: false,
        venueConflicts: [],
        scheduleOverlaps: [],
      };
    }

    const venueMap = new Map(venues.map((v) => [v.id, v.name]));

    for (const event of existingEvents) {
      // Exclude self if editing
      if (eventId && event.id === eventId) continue;
      // Exclude cancelled or rejected events
      if (event.status === "cancelled" || event.status === "rejected") continue;

      const eventStart = parseISO(event.start_time);
      const eventEnd = parseISO(event.end_time);

      // Check temporal overlap: eventStart < proposedEnd && eventEnd > proposedStart
      const overlaps = areIntervalsOverlapping(
        { start: proposedStart, end: proposedEnd },
        { start: eventStart, end: eventEnd },
        { inclusive: false }
      );

      if (overlaps) {
        // 1. Check for physical venue conflict (Hard conflict / prominent warning)
        if (venueId && event.venue_id && event.venue_id === venueId) {
          const venueName = venueMap.get(venueId) || event.location_name || "Selected Venue";
          const formattedEventTime = `${format(eventStart, "h:mm a")}–${format(eventEnd, "h:mm a")}`;

          venueConflicts.push({
            type: "venue",
            venueId,
            venueName,
            conflictingEvent: event,
            message: `${venueName} is already booked from ${formattedEventTime}. Conflicting event: "${event.title}".`,
          });
        }

        // 2. Schedule overlap (Informational campus scheduling notice)
        const overlapTime = `${format(eventStart, "h:mm a")}–${format(eventEnd, "h:mm a")}`;
        scheduleOverlaps.push({
          type: "schedule",
          conflictingEvent: event,
          message: `"${event.title}" hosted by ${event.community?.name || "Campus Org"} (${overlapTime})`,
        });
      }
    }
  } catch (err) {
    console.error("Error evaluating conflicts:", err);
  }

  return {
    hasVenueConflict: venueConflicts.length > 0,
    hasScheduleOverlap: scheduleOverlaps.length > 0,
    venueConflicts,
    scheduleOverlaps,
  };
}
