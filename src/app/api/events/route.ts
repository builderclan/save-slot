import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CampusEvent } from "@/types/database";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const communitySlug = searchParams.get("community");
    const search = searchParams.get("search");
    const requestedStatus = searchParams.get("status") || "published";

    // Access control: Only admins & principals can view non-published (pending, draft, rejected) events
    let effectiveStatus = "published";
    if (requestedStatus !== "published") {
      const session = await getCurrentUser();
      if (session?.isAdmin || session?.isPrincipal) {
        effectiveStatus = requestedStatus;
      }
    }

    // Safe pagination defaults
    const rawLimit = parseInt(searchParams.get("limit") || "150", 10);
    const limit = isNaN(rawLimit) || rawLimit < 1 ? 150 : Math.min(rawLimit, 300);
    const rawOffset = parseInt(searchParams.get("offset") || "0", 10);
    const offset = isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset;

    let sql = `
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
      WHERE e.status = $1
    `;

    const params: unknown[] = [effectiveStatus];
    let paramIndex = 2;

    if (category && category !== "all") {
      sql += ` AND e.category = $${paramIndex++}`;
      params.push(category);
    }

    if (communitySlug && communitySlug !== "all") {
      sql += ` AND c.slug = $${paramIndex++}`;
      params.push(communitySlug);
    }

    if (search && search.trim() !== "") {
      sql += ` AND (e.title ILIKE $${paramIndex} OR e.description ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex})`;
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    sql += ` ORDER BY e.start_time ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++};`;
    params.push(limit, offset);

    const res = await query<CampusEvent>(sql, params);

    return NextResponse.json({ events: res.rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
