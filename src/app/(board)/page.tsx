import { withDbRetry } from "@/lib/db";
import { events, communities, departments, venues, users, communityMembers } from "@/db/schema";
import { eq, asc, getTableColumns, aliasedTable, sql, inArray } from "drizzle-orm";
import { formatCampusEvent, formatDepartment, formatVenue } from "@/db/adapters";
import { CampusEvent, Department, Venue } from "@/types/database";
import { NoticeBoardClient } from "@/features/events";

// Incremental Static Regeneration: Cache at the Edge with 60s background revalidation
export const revalidate = 60;

const creators = aliasedTable(users, "creators");
const reviewers = aliasedTable(users, "reviewers");

export default async function StudentNoticeBoardPage() {
  let initialEvents: CampusEvent[] = [];
  let initialVenues: Venue[] = [];
  let initialDepartments: Department[] = [];

  try {
    const [eventsRows, venuesRows, deptRows] = await Promise.all([
      withDbRetry((client) =>
        client
          .select({
            ...getTableColumns(events),
            community: {
              id: communities.id,
              name: communities.name,
              slug: communities.slug,
              code: communities.code,
              scope: communities.scope,
              category: communities.category,
              logoUrl: communities.logoUrl,
              leadName: sql<string | null>`(SELECT u.full_name FROM ${communityMembers} cm JOIN ${users} u ON u.id = cm.user_id WHERE cm.community_id = ${communities.id} AND cm.role = 'lead' LIMIT 1)`,
            },
            department: {
              id: departments.id,
              name: departments.name,
              code: departments.code,
              isActingHodActive: departments.isActingHodActive,
              isActive: departments.isActive,
            },
            venue: {
              id: venues.id,
              name: venues.name,
              building: venues.building,
              capacity: venues.capacity,
              address: venues.address,
              notes: venues.notes,
              isActive: venues.isActive,
            },
            creator: {
              id: creators.id,
              fullName: creators.fullName,
              role: creators.role,
            },
            reviewer: {
              id: reviewers.id,
              fullName: reviewers.fullName,
              role: reviewers.role,
            },
          })
          .from(events)
          .leftJoin(communities, eq(communities.id, events.communityId))
          .leftJoin(departments, eq(departments.id, events.departmentId))
          .leftJoin(venues, eq(venues.id, events.venueId))
          .leftJoin(creators, eq(creators.id, events.createdBy))
          .leftJoin(reviewers, eq(reviewers.id, events.reviewedBy))
          .where(inArray(events.status, ["published", "pending_report_verification", "completed"]))
          .orderBy(asc(events.startTime))
          .limit(200)
      ),
      withDbRetry((client) =>
        client
          .select({
            id: venues.id,
            name: venues.name,
            building: venues.building,
            capacity: venues.capacity,
            address: venues.address,
            notes: venues.notes,
            isActive: venues.isActive,
            createdAt: venues.createdAt,
          })
          .from(venues)
          .where(eq(venues.isActive, true))
          .orderBy(asc(venues.name))
      ),
      withDbRetry((client) =>
        client
          .select()
          .from(departments)
          .where(eq(departments.isActive, true))
          .orderBy(asc(departments.code))
      ),
    ]);

    initialEvents = eventsRows.map(formatCampusEvent);
    initialVenues = venuesRows.map(formatVenue);
    initialDepartments = deptRows.map(formatDepartment);
  } catch (err) {
    console.warn("Notice board pre-render: database query failed (build/offline fallback):", err);
  }

  return (
    <NoticeBoardClient
      initialEvents={initialEvents}
      initialVenues={initialVenues}
      initialDepartments={initialDepartments}
    />
  );
}
