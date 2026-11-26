import { and, asc, eq, isNull, lt, or } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";
import { eventReports, events } from "@/db/schema";

export type DbClientOrTx = NodePgDatabase<typeof schema>;

export interface OverdueReportSummary {
  id: string;
  title: string;
  reference_number: string | null;
  start_time: string;
  end_time: string;
}

/**
 * Returns published events owned (`created_by`) or coordinated (`coordinator_id`) by
 * `userId` whose `end_time` has passed without a submitted `event_reports` record.
 */
export async function getOverdueClosureEvents(
  client: DbClientOrTx,
  userId: string,
  now: Date = new Date()
): Promise<OverdueReportSummary[]> {
  const rows = await client
    .select({
      id: events.id,
      title: events.title,
      referenceNumber: events.referenceNumber,
      startTime: events.startTime,
      endTime: events.endTime,
    })
    .from(events)
    .leftJoin(eventReports, eq(eventReports.eventId, events.id))
    .where(
      and(
        eq(events.status, "published"),
        lt(events.endTime, now),
        or(eq(events.createdBy, userId), eq(events.coordinatorId, userId)),
        isNull(eventReports.id)
      )
    )
    .orderBy(asc(events.endTime));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    reference_number: row.referenceNumber ?? null,
    start_time: row.startTime instanceof Date ? row.startTime.toISOString() : String(row.startTime),
    end_time: row.endTime instanceof Date ? row.endTime.toISOString() : String(row.endTime),
  }));
}
