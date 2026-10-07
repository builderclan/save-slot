import { query } from "@/lib/db";
import {
  CampusEvent,
  ConflictCheckResult,
  SafeSlotSuggestion,
  Venue,
} from "@/types/database";
import { addDays, addMinutes, differenceInDays, format } from "date-fns";

export async function checkEventConflicts(params: {
  venueId: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  excludeEventId?: string;
  category?: string;
}): Promise<ConflictCheckResult> {
  const { venueId, startTime, endTime, excludeEventId } = params;

  const start = new Date(startTime);
  let end = new Date(endTime);
  const now = new Date();

  // If end <= start (e.g. overnight 21:00 to 02:00), adjust end to next day
  if (end.getTime() <= start.getTime()) {
    end = addDays(end, 1);
  }

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
  let clashSql = `
    SELECT 
      e.id, e.title, e.start_time, e.end_time, e.category, e.status, e.venue_id,
      json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) as community,
      json_build_object('id', v.id, 'name', v.name, 'building', v.building) as venue
    FROM public.events e
    JOIN public.communities c ON c.id = e.community_id
    JOIN public.venues v ON v.id = e.venue_id
    WHERE e.venue_id = $1
      AND e.status NOT IN ('rejected', 'cancelled')
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
    const campusId = targetVenue?.campus_id;

    if (hasLeadTimeViolation) {
      // SCENARIO A: Lead-time policy violation (< 7 days)
      // All suggested slots MUST comply with the 7-day rule (>= 8 days in advance)
      const baseSafeDay = addDays(now, 8);

      // Option 1: Earliest Safe Date in Target Venue (Same Desired Time Window)
      const safeStart1 = new Date(baseSafeDay);
      safeStart1.setHours(start.getHours(), start.getMinutes(), 0, 0);
      const safeEnd1 = addMinutes(safeStart1, durationMinutes);

      let slot1Sql = `SELECT id FROM public.events 
       WHERE venue_id = $1 AND status NOT IN ('rejected', 'cancelled')
         AND start_time < $3 AND end_time > $2`;
      const slot1Params: unknown[] = [venueId, safeStart1.toISOString(), safeEnd1.toISOString()];
      if (excludeEventId) {
        slot1Sql += ` AND id != $4`;
        slot1Params.push(excludeEventId);
      }
      const slot1Clash = await query(slot1Sql, slot1Params);

      if (slot1Clash.rows.length === 0) {
        safeSlots.push({
          type: "next_day",
          label: `Earliest Safe Date (${format(safeStart1, "EEE, MMM d")})`,
          venue_id: venueId,
          venue_name: targetVenue ? targetVenue.name : "Target Venue",
          start_time: safeStart1.toISOString(),
          end_time: safeEnd1.toISOString(),
          reason: `Complies with 7-day campus notice policy in ${targetVenue?.name || "your venue"}.`,
        });
      }

      // Option 2: Alternative Active Campus Venue on the Earliest Safe Date
      if (campusId) {
        let altSql = `SELECT v.id, v.name, v.building, v.capacity
           FROM public.venues v
           WHERE v.campus_id = $1 
             AND v.id != $2 
             AND v.is_active = true
             AND NOT EXISTS (
               SELECT 1 FROM public.events e
               WHERE e.venue_id = v.id 
                 AND e.status NOT IN ('rejected', 'cancelled')
                 AND e.start_time < $4 AND e.end_time > $3
                 ${excludeEventId ? "AND e.id != $5" : ""}
             )
           ORDER BY v.capacity DESC
           LIMIT 1;`;
        const altParams: unknown[] = [campusId, venueId, safeStart1.toISOString(), safeEnd1.toISOString()];
        if (excludeEventId) altParams.push(excludeEventId);

        const altVenuesRes = await query<Venue>(altSql, altParams);
        for (const altV of altVenuesRes.rows) {
          safeSlots.push({
            type: "alternative_venue",
            label: `${altV.name} (${format(safeStart1, "MMM d")})`,
            venue_id: altV.id,
            venue_name: altV.name,
            start_time: safeStart1.toISOString(),
            end_time: safeEnd1.toISOString(),
            reason: `Policy-cleared alternative venue available during this time window.`,
          });
        }
      }

      // Option 3: Following Safe Day in Target Venue (+9 days from now)
      const safeStart3 = addDays(safeStart1, 1);
      const safeEnd3 = addMinutes(safeStart3, durationMinutes);

      let slot3Sql = `SELECT id FROM public.events 
       WHERE venue_id = $1 AND status NOT IN ('rejected', 'cancelled')
         AND start_time < $3 AND end_time > $2`;
      const slot3Params: unknown[] = [venueId, safeStart3.toISOString(), safeEnd3.toISOString()];
      if (excludeEventId) {
        slot3Sql += ` AND id != $4`;
        slot3Params.push(excludeEventId);
      }
      const slot3Clash = await query(slot3Sql, slot3Params);

      if (slot3Clash.rows.length === 0) {
        safeSlots.push({
          type: "next_day",
          label: `Following Day (${format(safeStart3, "EEE, MMM d")})`,
          venue_id: venueId,
          venue_name: targetVenue ? targetVenue.name : "Target Venue",
          start_time: safeStart3.toISOString(),
          end_time: safeEnd3.toISOString(),
          reason: `Clash-free alternative date with full 7+ days campus notice.`,
        });
      }
    } else {
      // SCENARIO B: No lead-time violation (>= 7 days), but venue collision exists
      // Option 1: Same Venue Later in the Day (if conflicting event ends with turnaround buffer)
      if (conflictingEvent) {
        const clashEnd = new Date(conflictingEvent.end_time);
        const slot1Start = addMinutes(clashEnd, 30); // 30-min buffer
        const slot1End = addMinutes(slot1Start, durationMinutes);

        let slot1Sql = `SELECT id FROM public.events 
           WHERE venue_id = $1 AND status NOT IN ('rejected', 'cancelled')
             AND start_time < $3 AND end_time > $2`;
        const slot1Params: unknown[] = [venueId, slot1Start.toISOString(), slot1End.toISOString()];
        if (excludeEventId) {
          slot1Sql += ` AND id != $4`;
          slot1Params.push(excludeEventId);
        }
        const slot1Clash = await query(slot1Sql, slot1Params);

        if (slot1Clash.rows.length === 0 && slot1Start.getHours() < 22) {
          safeSlots.push({
            type: "same_venue_later",
            label: `Same Day Later (${format(slot1Start, "h:mm a")})`,
            venue_id: venueId,
            venue_name: targetVenue ? targetVenue.name : "Target Venue",
            start_time: slot1Start.toISOString(),
            end_time: slot1End.toISOString(),
            reason: `30-minute buffer after ${conflictingEvent.community?.name || "prior event"} concludes.`,
          });
        }
      }

      // Option 2: Alternative Active Campus Venue at the Exact Same Time
      if (campusId) {
        let altSql = `SELECT v.id, v.name, v.building, v.capacity
           FROM public.venues v
           WHERE v.campus_id = $1 
             AND v.id != $2 
             AND v.is_active = true
             AND NOT EXISTS (
               SELECT 1 FROM public.events e
               WHERE e.venue_id = v.id 
                 AND e.status NOT IN ('rejected', 'cancelled')
                 AND e.start_time < $4 AND e.end_time > $3
                 ${excludeEventId ? "AND e.id != $5" : ""}
             )
           ORDER BY v.capacity DESC
           LIMIT 2;`;
        const altParams: unknown[] = [campusId, venueId, start.toISOString(), end.toISOString()];
        if (excludeEventId) altParams.push(excludeEventId);

        const altVenuesRes = await query<Venue>(altSql, altParams);
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

      // Option 3: Next Day Same Time in Target Venue
      const slot3Start = addDays(start, 1);
      const slot3End = addMinutes(slot3Start, durationMinutes);

      let slot3Sql = `SELECT id FROM public.events 
         WHERE venue_id = $1 AND status NOT IN ('rejected', 'cancelled')
           AND start_time < $3 AND end_time > $2`;
      const slot3Params: unknown[] = [venueId, slot3Start.toISOString(), slot3End.toISOString()];
      if (excludeEventId) {
        slot3Sql += ` AND id != $4`;
        slot3Params.push(excludeEventId);
      }
      const slot3Clash = await query(slot3Sql, slot3Params);

      if (slot3Clash.rows.length === 0) {
        safeSlots.push({
          type: "next_day",
          label: `Next Day Same Time (${format(slot3Start, "EEE, MMM d")})`,
          venue_id: venueId,
          venue_name: targetVenue ? targetVenue.name : "Target Venue",
          start_time: slot3Start.toISOString(),
          end_time: slot3End.toISOString(),
          reason: "Identical time slot free of collisions the following day.",
        });
      }
    }
  }

  let message = "This slot is verified and completely clash-free.";
  if (hasConflict && hasLeadTimeViolation) {
    message = `Venue collision with "${conflictingEvent?.title}" AND notice is less than 7 days in advance. Select a safe slot below.`;
  } else if (hasConflict) {
    message = `Venue collision: ${targetVenue?.name || "Venue"} is already booked by ${
      conflictingEvent?.community?.name || "another organization"
    } for "${conflictingEvent?.title}".`;
  } else if (hasLeadTimeViolation) {
    message = `Campus policy violation: Event must be submitted at least 7 days in advance (currently ${diffDays} day${
      diffDays === 1 ? "" : "s"
    } away). Select a recommended safe slot below.`;
  }

  return {
    hasConflict,
    hasLeadTimeViolation,
    leadTimeDays: diffDays,
    conflictingEvent,
    message,
    safeSlots: safeSlots.slice(0, 3), // Return top 3 policy-cleared options
  };
}
