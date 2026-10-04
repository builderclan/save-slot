import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CampusEvent, Venue } from "@/types/database";
import {
  NoticeBoardClient,
  UserSessionState,
} from "@/components/notice-board/notice-board-client";

export const dynamic = "force-dynamic";

export default async function StudentNoticeBoardPage() {
  let initialEvents: CampusEvent[] = [];
  let initialVenues: Venue[] = [];
  let initialUserSession: UserSessionState | null = null;

  try {
    const [eventsRes, venuesRes, session] = await Promise.all([
      query<CampusEvent>(`
        SELECT 
          e.id, e.campus_id, e.community_id, e.venue_id, e.created_by,
          e.title, e.slug, e.description, e.category, e.tags,
          e.start_time, e.end_time, e.timezone, e.location_name,
          e.is_virtual, e.virtual_link, e.external_registration_url, e.cover_image_url,
          e.status, e.rejection_reason, e.cancellation_reason, e.created_at, e.updated_at,
          json_build_object(
            'id', c.id,
            'name', c.name,
            'slug', c.slug,
            'category', c.category,
            'logo_url', c.logo_url
          ) as community,
          CASE 
            WHEN v.id IS NULL THEN NULL 
            ELSE json_build_object(
              'id', v.id,
              'name', v.name,
              'building', v.building,
              'capacity', v.capacity,
              'address', v.address,
              'notes', v.notes
            )
          END as venue
        FROM public.events e
        JOIN public.communities c ON c.id = e.community_id
        LEFT JOIN public.venues v ON v.id = e.venue_id
        WHERE e.status = 'published'
        ORDER BY e.start_time ASC
        LIMIT 200;
      `),
      query<Venue>(
        "SELECT id, campus_id, name, building, capacity, address, notes, is_active FROM public.venues WHERE is_active = true ORDER BY name ASC;"
      ),
      getCurrentUser(),
    ]);

    // Serialize PostgreSQL Date objects to ISO 8601 strings to maintain parity with API responses
    initialEvents = JSON.parse(JSON.stringify(eventsRes.rows));
    initialVenues = JSON.parse(JSON.stringify(venuesRes.rows));


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
