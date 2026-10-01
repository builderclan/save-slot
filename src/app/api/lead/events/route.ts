import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { CampusEvent } from "@/types/database";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session || (!session.isLead && !session.isAdmin)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const communityIds = session.leadCommunities.map((c) => c.id);

    let sql = `
      SELECT 
        e.id, e.campus_id, e.community_id, e.venue_id, e.created_by,
        e.title, e.slug, e.description, e.category, e.tags,
        e.start_time, e.end_time, e.timezone, e.location_name,
        e.is_virtual, e.virtual_link, e.external_registration_url, e.cover_image_url,
        e.status, e.rejection_reason, e.cancellation_reason, e.created_at, e.updated_at,
        json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) as community,
        json_build_object('id', v.id, 'name', v.name, 'building', v.building, 'capacity', v.capacity) as venue
      FROM public.events e
      JOIN public.communities c ON c.id = e.community_id
      LEFT JOIN public.venues v ON v.id = e.venue_id
    `;

    const params: unknown[] = [];
    if (!session.isAdmin && communityIds.length > 0) {
      sql += ` WHERE e.community_id = ANY($1)`;
      params.push(communityIds);
    }

    sql += ` ORDER BY e.start_time DESC;`;

    const res = await query<CampusEvent>(sql, params);
    return NextResponse.json({ events: res.rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load lead events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || (!session.isLead && !session.isAdmin)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      category,
      venueId,
      startTime,
      endTime,
      description,
      coverImageUrl,
      externalRegistrationUrl,
      communityId: providedCommunityId,
    } = body;

    if (!title || !category || !venueId || !startTime || !endTime || !description) {
      return NextResponse.json(
        { error: "Title, category, venue, start time, end time, and description are required." },
        { status: 400 }
      );
    }

    // Determine community id
    let targetCommunityId = providedCommunityId;
    if (!targetCommunityId && session.leadCommunities.length > 0) {
      targetCommunityId = session.leadCommunities[0].id;
    }

    if (!targetCommunityId) {
      return NextResponse.json(
        { error: "No community assigned to this lead." },
        { status: 400 }
      );
    }

    // Query venue info for location_name and campus_id
    const venueRes = await query<{ name: string; campus_id: string }>(
      "SELECT name, campus_id FROM public.venues WHERE id = $1;",
      [venueId]
    );

    if (venueRes.rows.length === 0) {
      return NextResponse.json({ error: "Selected venue not found." }, { status: 404 });
    }

    const { name: venueName, campus_id: campusId } = venueRes.rows[0];

    // Generate unique slug
    let baseSlug = slugify(title);
    if (!baseSlug) baseSlug = "campus-event";
    const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

    const insertSql = `
      INSERT INTO public.events (
        campus_id, community_id, venue_id, created_by,
        title, slug, description, category,
        start_time, end_time, location_name,
        status, cover_image_url, external_registration_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12, $13)
      RETURNING *;
    `;

    const insRes = await query<CampusEvent>(insertSql, [
      campusId,
      targetCommunityId,
      venueId,
      session.userId,
      title.trim(),
      uniqueSlug,
      description.trim(),
      category,
      new Date(startTime).toISOString(),
      new Date(endTime).toISOString(),
      venueName,
      coverImageUrl || null,
      externalRegistrationUrl || null,
    ]);

    return NextResponse.json({ success: true, event: insRes.rows[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to submit event proposal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
