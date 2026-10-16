import { withDbRetry } from "@/lib/db";
import { events, communities, venues, users, communityMembers } from "@/db/schema";
import { eq, asc, getTableColumns, aliasedTable, sql } from "drizzle-orm";
import { formatCampusEvent, formatVenue } from "@/db/adapters";
import { getCurrentUser } from "@/lib/auth";
import { CampusEvent, Venue } from "@/types/database";
import {
  NoticeBoardClient,
  UserSessionState,
} from "@/components/notice-board/notice-board-client";

export const dynamic = "force-dynamic";

const creators = aliasedTable(users, "creators");
const reviewers = aliasedTable(users, "reviewers");

export default async function StudentNoticeBoardPage() {
  let initialEvents: CampusEvent[] = [];
  let initialVenues: Venue[] = [];
  let initialUserSession: UserSessionState | null = null;

  try {
    const [eventsRows, venuesRows, session] = await Promise.all([
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
      getCurrentUser(),
    ]);

    initialEvents = eventsRows.map(formatCampusEvent);
    initialVenues = venuesRows.map(formatVenue);

    if (session) {
      initialUserSession = {
        authenticated: true,
        user: {
          fullName: session.profile.full_name,
          isLead: session.isLead,
          isAdmin: session.isAdmin,
          isPrincipal: session.isPrincipal,
          isVicePrincipal: session.isVicePrincipal,
          role: session.profile.role,
          leadCommunities: session.leadCommunities.map((c) => ({
            id: c.id,
            name: c.name,
          })),
        },
      };
    }
  } catch (err) {
    console.error("Error performing SSR query in StudentNoticeBoardPage:", err);
  }

  return (
    <NoticeBoardClient
      initialEvents={initialEvents}
      initialVenues={initialVenues}
      initialUserSession={initialUserSession}
    />
  );
}
