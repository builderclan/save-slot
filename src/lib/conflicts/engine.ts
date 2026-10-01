import { query } from "@/lib/db";
import {
  CampusEvent,
  ConflictCheckResult,
  SafeSlotSuggestion,
  Venue,
} from "@/types/database";
import { addDays, addMinutes, differenceInDays } from "date-fns";

export async function checkEventConflicts(params: {
  venueId: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  excludeEventId?: string;
  category?: string;
}): Promise<ConflictCheckResult> {
  const { venueId, startTime, endTime, excludeEventId } = params;

  const start = new Date(startTime);
  const end = new Date(endTime);
  const now = new Date();

  // 1. Check Lead-Time Policy (7 Days Advance Notice Rule)
  const diffDays = differenceInDays(start, now);
  const minRequiredDays = 7;
  const hasLeadTimeViolation = diffDays < minRequiredDays;

  // 2. Query target venue info
  const targetVenueRes = await query<Venue>(
    "SELECT id, campus_id, name, building, capacity, is_active FROM public.venues WHERE id = $1;",
    [venueId]
  );
  const targetVenue = targetVenueRes.rows[0];

  // 3. Query Colliding Events in the Same Venue
  // Condition: (start < existing.end_time) AND (end > existing.start_time) AND status != 'rejected'
  let clashSql = `
    SELECT 
      e.id, e.title, e.start_time, e.end_time, e.category, e.status, e.venue_id,
      json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) as community,
      json_build_object('id', v.id, 'name', v.name, 'building', v.building) as venue
    FROM public.events e
    JOIN public.communities c ON c.id = e.community_id
    JOIN public.venues v ON v.id = e.venue_id
    WHERE e.venue_id = $1
      AND e.status != 'rejected'
      AND e.status != 'cancelled'
      AND e.start_time < $3
      AND e.end_time > $2
  `;

  const clashParams: unknown[] = [venueId, start.toISOString(), end.toISOString()];
  if (excludeEventId) {
    clashSql += ` AND e.id != $4`;
    clashParams.push(excludeEventId);
  }

  const clashRes = await query<CampusEvent>(clashSql, clashParams);
  const conflictingEvent = clashRes.rows[0] || null;
  const hasConflict = clashRes.rows.length > 0;

  // 4. Generate Safe Slot Suggestions if conflict or violation exists
  const safeSlots: SafeSlotSuggestion[] = [];

  if (hasConflict || hasLeadTimeViolation) {
    const durationMinutes = Math.max(
      30,
      Math.round((end.getTime() - start.getTime()) / 60000)
    );

    // Option 1: Same Venue Later in the Day (if conflicting event ends before 8:30pm)
    if (conflictingEvent) {
      const clashEnd = new Date(conflictingEvent.end_time);
      const slot1Start = addMinutes(clashEnd, 30); // 30-min turnaround buffer
      const slot1End = addMinutes(slot1Start, durationMinutes);

      // Verify slot1 doesn't conflict with another event in target venue
      const slot1Clash = await query(
        `SELECT id FROM public.events 
         WHERE venue_id = $1 AND status NOT IN ('rejected', 'cancelled')
           AND start_time < $3 AND end_time > $2;`,
        [venueId, slot1Start.toISOString(), slot1End.toISOString()]
      );

      if (slot1Clash.rows.length === 0 && slot1Start.getHours() < 21) {
        safeSlots.push({
          type: "same_venue_later",
          label: `Same Day Later (${slot1Start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })})`,
          venue_id: venueId,
          venue_name: targetVenue ? targetVenue.name : "Target Venue",
          start_time: slot1Start.toISOString(),
          end_time: slot1End.toISOString(),
          reason: `30-minute buffer after ${conflictingEvent.community?.name || "prior event"} concludes.`,
        });
      }
    }

    // Option 2: Alternative Active Venue at the Same Desired Time
    const campusId = targetVenue?.campus_id;
    if (campusId) {
      const altVenuesRes = await query<Venue>(
        `SELECT v.id, v.name, v.building, v.capacity
         FROM public.venues v
         WHERE v.campus_id = $1 
           AND v.id != $2 
           AND v.is_active = true
           AND NOT EXISTS (
             SELECT 1 FROM public.events e
             WHERE e.venue_id = v.id 
               AND e.status NOT IN ('rejected', 'cancelled')
               AND e.start_time < $4 AND e.end_time > $3
           )
         ORDER BY v.capacity DESC
         LIMIT 2;`,
        [campusId, venueId, start.toISOString(), end.toISOString()]
      );

      for (const altV of altVenuesRes.rows) {
        safeSlots.push({
          type: "alternative_venue",
          label: `${altV.name} (Same Time)`,
          venue_id: altV.id,
          venue_name: altV.name,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          reason: `Unoccupied during this time window (Capacity: ${altV.capacity}).`,
        });
      }
    }

    // Option 3: Next Available Day or Valid Lead-Time Day (+7 or +8 days)
    const baseTargetDay = hasLeadTimeViolation ? addDays(now, 8) : addDays(start, 1);
    const slot3Start = new Date(baseTargetDay);
    slot3Start.setHours(start.getHours(), start.getMinutes(), 0, 0);
    const slot3End = addMinutes(slot3Start, durationMinutes);

    const slot3Clash = await query(
      `SELECT id FROM public.events 
       WHERE venue_id = $1 AND status NOT IN ('rejected', 'cancelled')
         AND start_time < $3 AND end_time > $2;`,
      [venueId, slot3Start.toISOString(), slot3End.toISOString()]
    );

    if (slot3Clash.rows.length === 0) {
      safeSlots.push({
        type: "next_day",
        label: hasLeadTimeViolation
          ? `Earliest Safe Date (${slot3Start.toLocaleDateString([], { month: "short", day: "numeric" })})`
          : `Next Day Same Time (${slot3Start.toLocaleDateString([], { weekday: "short" })})`,
        venue_id: venueId,
        venue_name: targetVenue ? targetVenue.name : "Target Venue",
        start_time: slot3Start.toISOString(),
        end_time: slot3End.toISOString(),
        reason: hasLeadTimeViolation
          ? "Satisfies the 7-day campus notice policy with full venue availability."
          : "Identical time slot free of collisions the following day.",
      });
    }
  }

  let message = "This slot is verified and completely clash-free.";
  if (hasConflict && hasLeadTimeViolation) {
    message = `Venue collision with "${conflictingEvent?.title}" AND notice is less than 7 days in advance.`;
  } else if (hasConflict) {
    message = `Venue collision: ${targetVenue?.name || "Venue"} is already booked by ${
      conflictingEvent?.community?.name || "another organization"
    } for "${conflictingEvent?.title}".`;
  } else if (hasLeadTimeViolation) {
    message = `Campus policy violation: Event must be submitted at least 7 days in advance (currently ${diffDays} day${
      diffDays === 1 ? "" : "s"
    } away).`;
  }

  return {
    hasConflict,
    hasLeadTimeViolation,
    leadTimeDays: diffDays,
    conflictingEvent,
    message,
    safeSlots: safeSlots.slice(0, 3), // Return top 3 options
  };
}
