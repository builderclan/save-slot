import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { CampusEvent } from "@/types/database";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const communitySlug = searchParams.get("community");
    const search = searchParams.get("search");
    const status = searchParams.get("status") || "published";

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
        json_build_object(
          'id', v.id,
          'name', v.name,
          'building', v.building,
          'capacity', v.capacity,
          'address', v.address,
          'notes', v.notes
        ) as venue
      FROM public.events e
      JOIN public.communities c ON c.id = e.community_id
      LEFT JOIN public.venues v ON v.id = e.venue_id
      WHERE e.status = $1
    `;

    const params: unknown[] = [status];
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

    sql += ` ORDER BY e.start_time ASC;`;

    const res = await query<CampusEvent>(sql, params);

    return NextResponse.json({ events: res.rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
