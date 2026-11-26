import { and, eq, gt, inArray, lt, ne } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";
import { events, venues } from "@/db/schema";
import {
  checkEventConflicts,
  doAudiencesOverlap,
  getOverlappingAudience,
  getPotentiallyOverlappingCohorts,
} from "@/lib/conflicts/engine";

export type DbClientOrTx = NodePgDatabase<typeof schema>;

/**
 * Statuses that hold a soft or hard reservation on a campus venue slot.
 */
export const ACTIVE_BOOKING_STATUSES = [
  "pending_stage2",
  "pending_executive",
  "published",
  "pending_report_verification",
  "completed",
] as const;

export {
  checkEventConflicts,
  doAudiencesOverlap,
  getOverlappingAudience,
  getPotentiallyOverlappingCohorts,
};

export interface CollidingEventSummary {
  id: string;
  title: string;
  status: string;
  originType: string;
  startTime: Date;
  endTime: Date;
  createdBy: string | null;
  coordinatorId: string | null;
  communityId: string | null;
  departmentId: string | null;
}

/**
 * Queries all active soft/hard bookings overlapping `[startTime, endTime]` for `venueId`.
 */
export async function findCollidingEventsForSlot(
  client: DbClientOrTx,
  params: {
    venueId: string;
    startTime: Date;
    endTime: Date;
    excludeEventId?: string;
    lockForUpdate?: boolean;
  }
): Promise<CollidingEventSummary[]> {
  const conditions = [
    eq(events.venueId, params.venueId),
    inArray(events.status, [...ACTIVE_BOOKING_STATUSES]),
    lt(events.startTime, params.endTime),
    gt(events.endTime, params.startTime),
  ];
  if (params.excludeEventId) {
    conditions.push(ne(events.id, params.excludeEventId));
  }

  const baseQuery = client
    .select({
      id: events.id,
      title: events.title,
      status: events.status,
      originType: events.originType,
      startTime: events.startTime,
      endTime: events.endTime,
      createdBy: events.createdBy,
      coordinatorId: events.coordinatorId,
      communityId: events.communityId,
      departmentId: events.departmentId,
    })
    .from(events)
    .where(and(...conditions));

  return params.lockForUpdate ? baseQuery.for("update") : baseQuery;
}

/**
 * Serializes concurrent venue reservations inside a DB transaction by locking the
 * target venue row first (`FOR UPDATE`), then checking overlapping bookings.
 */
export async function assertVenueSlotAvailableForTx(
  tx: DbClientOrTx,
  params: {
    venueId: string;
    startTime: Date;
    endTime: Date;
    excludeEventId?: string;
  }
): Promise<
  | { ok: true; venueName: string }
  | { ok: false; reason: "venue_not_found" | "venue_inactive" | "slot_conflict"; collidingEvent?: CollidingEventSummary }
> {
  const [venueRow] = await tx
    .select({
      id: venues.id,
      name: venues.name,
      isActive: venues.isActive,
    })
    .from(venues)
    .where(eq(venues.id, params.venueId))
    .for("update")
    .limit(1);

  if (!venueRow) {
    return { ok: false, reason: "venue_not_found" };
  }
  if (!venueRow.isActive) {
    return { ok: false, reason: "venue_inactive" };
  }

  const collisions = await findCollidingEventsForSlot(tx, {
    venueId: params.venueId,
    startTime: params.startTime,
    endTime: params.endTime,
    excludeEventId: params.excludeEventId,
    lockForUpdate: true,
  });

  if (collisions.length > 0) {
    return {
      ok: false,
      reason: "slot_conflict",
      collidingEvent: collisions[0],
    };
  }

  return { ok: true, venueName: venueRow.name };
}
