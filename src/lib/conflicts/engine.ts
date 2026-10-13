import { withDbRetry } from "@/lib/db";
import { events, venues, communities } from "@/db/schema";
import {
  eq,
  ne,
  and,
  notInArray,
  lt,
  gt,
  desc,
  notExists,
  getTableColumns,
} from "drizzle-orm";
import { formatCampusEvent, formatVenue } from "@/db/adapters";
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
  const targetVenueRows = await withDbRetry((client) =>
    client
      .select({
        id: venues.id,
        campusId: venues.campusId,
        name: venues.name,
        building: venues.building,
        capacity: venues.capacity,
        address: venues.address,
        notes: venues.notes,
        isActive: venues.isActive,
        createdAt: venues.createdAt,
      })
      .from(venues)
      .where(eq(venues.id, venueId))
      .limit(1)
  );
  const targetVenue: Venue | null = targetVenueRows[0]
    ? formatVenue(targetVenueRows[0])
    : null;

  // 3. Query Colliding Events in the Same Venue
  const clashConditions = [
    eq(events.venueId, venueId),
    notInArray(events.status, ["rejected", "cancelled"]),
    lt(events.startTime, end),
    gt(events.endTime, start),
  ];
  if (excludeEventId) {
    clashConditions.push(ne(events.id, excludeEventId));
  }

  const clashRows = await withDbRetry((client) =>
    client
      .select({
        ...getTableColumns(events),
        community: {
          id: communities.id,
          campusId: communities.campusId,
          name: communities.name,
          slug: communities.slug,
          category: communities.category,
          logoUrl: communities.logoUrl,
        },
        venue: {
          id: venues.id,
          campusId: venues.campusId,
          name: venues.name,
          building: venues.building,
          capacity: venues.capacity,
          address: venues.address,
          notes: venues.notes,
          isActive: venues.isActive,
        },
      })
      .from(events)
      .innerJoin(communities, eq(communities.id, events.communityId))
      .leftJoin(venues, eq(venues.id, events.venueId))
      .where(and(...clashConditions))
      .limit(1)
  );

  const conflictingEvent: CampusEvent | null = clashRows[0]
    ? formatCampusEvent(clashRows[0])
    : null;
  const hasConflict = clashRows.length > 0;

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

      const slot1Conditions = [
        eq(events.venueId, venueId),
        notInArray(events.status, ["rejected", "cancelled"]),
        lt(events.startTime, safeEnd1),
        gt(events.endTime, safeStart1),
      ];
      if (excludeEventId) {
        slot1Conditions.push(ne(events.id, excludeEventId));
      }

      const slot1Clash = await withDbRetry((client) =>
        client
          .select({ id: events.id })
          .from(events)
          .where(and(...slot1Conditions))
          .limit(1)
      );

      if (slot1Clash.length === 0) {
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
        const altEventConditions = [
          eq(events.venueId, venues.id),
          notInArray(events.status, ["rejected", "cancelled"]),
          lt(events.startTime, safeEnd1),
          gt(events.endTime, safeStart1),
        ];
        if (excludeEventId) {
          altEventConditions.push(ne(events.id, excludeEventId));
        }

        const altVenuesRes = await withDbRetry((client) =>
          client
            .select({
              id: venues.id,
              campusId: venues.campusId,
              name: venues.name,
              building: venues.building,
              capacity: venues.capacity,
              address: venues.address,
              notes: venues.notes,
              isActive: venues.isActive,
            })
            .from(venues)
            .where(
              and(
                eq(venues.campusId, campusId),
                ne(venues.id, venueId),
                eq(venues.isActive, true),
                notExists(
                  client
                    .select({ id: events.id })
                    .from(events)
                    .where(and(...altEventConditions))
                )
              )
            )
            .orderBy(desc(venues.capacity))
            .limit(1)
        );

        for (const altV of altVenuesRes) {
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

      const slot3Conditions = [
        eq(events.venueId, venueId),
        notInArray(events.status, ["rejected", "cancelled"]),
        lt(events.startTime, safeEnd3),
        gt(events.endTime, safeStart3),
      ];
      if (excludeEventId) {
        slot3Conditions.push(ne(events.id, excludeEventId));
      }

      const slot3Clash = await withDbRetry((client) =>
        client
          .select({ id: events.id })
          .from(events)
          .where(and(...slot3Conditions))
          .limit(1)
      );

      if (slot3Clash.length === 0) {
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

        const slot1Conditions = [
          eq(events.venueId, venueId),
          notInArray(events.status, ["rejected", "cancelled"]),
          lt(events.startTime, slot1End),
          gt(events.endTime, slot1Start),
        ];
        if (excludeEventId) {
          slot1Conditions.push(ne(events.id, excludeEventId));
        }

        const slot1Clash = await withDbRetry((client) =>
          client
            .select({ id: events.id })
            .from(events)
            .where(and(...slot1Conditions))
            .limit(1)
        );

        if (slot1Clash.length === 0 && slot1Start.getHours() < 22) {
          safeSlots.push({
            type: "same_venue_later",
            label: `Same Day Later (${format(slot1Start, "h:mm a")})`,
            venue_id: venueId,
            venue_name: targetVenue ? targetVenue.name : "Target Venue",
            start_time: slot1Start.toISOString(),
            end_time: slot1End.toISOString(),
            reason: `30-minute buffer after ${
              conflictingEvent.community?.name || "prior event"
            } concludes.`,
          });
        }
      }

      // Option 2: Alternative Active Campus Venue at the Exact Same Time
      if (campusId) {
        const altEventConditions = [
          eq(events.venueId, venues.id),
          notInArray(events.status, ["rejected", "cancelled"]),
          lt(events.startTime, end),
          gt(events.endTime, start),
        ];
        if (excludeEventId) {
          altEventConditions.push(ne(events.id, excludeEventId));
        }

        const altVenuesRes = await withDbRetry((client) =>
          client
            .select({
              id: venues.id,
              campusId: venues.campusId,
              name: venues.name,
              building: venues.building,
              capacity: venues.capacity,
              address: venues.address,
              notes: venues.notes,
              isActive: venues.isActive,
            })
            .from(venues)
            .where(
              and(
                eq(venues.campusId, campusId),
                ne(venues.id, venueId),
                eq(venues.isActive, true),
                notExists(
                  client
                    .select({ id: events.id })
                    .from(events)
                    .where(and(...altEventConditions))
                )
              )
            )
            .orderBy(desc(venues.capacity))
            .limit(2)
        );

        for (const altV of altVenuesRes) {
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

      const slot3Conditions = [
        eq(events.venueId, venueId),
        notInArray(events.status, ["rejected", "cancelled"]),
        lt(events.startTime, slot3End),
        gt(events.endTime, slot3Start),
      ];
      if (excludeEventId) {
        slot3Conditions.push(ne(events.id, excludeEventId));
      }

      const slot3Clash = await withDbRetry((client) =>
        client
          .select({ id: events.id })
          .from(events)
          .where(and(...slot3Conditions))
          .limit(1)
      );

      if (slot3Clash.length === 0) {
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
