import { withDbRetry } from "@/lib/db";
import { events, communities, venues, users, communityMembers } from "@/db/schema";
import { eq, asc, getTableColumns, aliasedTable, sql } from "drizzle-orm";
import { formatCampusEvent, formatVenue } from "@/db/adapters";
import { CampusEvent, Venue } from "@/types/database";
import { NoticeBoardClient } from "@/components/notice-board/notice-board-client";

// Incremental Static Regeneration: Cache at the Edge with 60s background revalidation
export const revalidate = 60;

const creators = aliasedTable(users, "creators");
const reviewers = aliasedTable(users, "reviewers");

export default async function StudentNoticeBoardPage() {
  let initialEvents: CampusEvent[] = [];
  let initialVenues: Venue[] = [];

  try {
    const [eventsRows, venuesRows] = await Promise.all([
      withDbRetry((client) =>
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
              leadName: sql<string | null>`(SELECT u.full_name FROM ${communityMembers} cm JOIN ${users} u ON u.id = cm.user_id WHERE cm.community_id = ${communities.id} AND cm.role = 'lead' LIMIT 1)`,
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
          .innerJoin(communities, eq(communities.id, events.communityId))
          .leftJoin(venues, eq(venues.id, events.venueId))
          .leftJoin(creators, eq(creators.id, events.createdBy))
          .leftJoin(reviewers, eq(reviewers.id, events.reviewedBy))
          .where(eq(events.status, "published"))
          .orderBy(asc(events.startTime))
          .limit(200)
      ),
      withDbRetry((client) =>
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
          .where(eq(venues.isActive, true))
          .orderBy(asc(venues.name))
      ),
    ]);

    initialEvents = eventsRows.map(formatCampusEvent);
    initialVenues = venuesRows.map(formatVenue);
  } catch (err) {
    console.error("Error performing ISR query in StudentNoticeBoardPage:", err);
    throw err;
  }

  return (
    <NoticeBoardClient
      initialEvents={initialEvents}
      initialVenues={initialVenues}
    />
  );
}
