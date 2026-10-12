import { NextResponse } from "next/server";
import { withDbRetry } from "@/lib/db";
import { events, communities, venues } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { formatCampusEvent } from "@/db/adapters";
import { eq, and, or, ilike, asc, getTableColumns, SQL } from "drizzle-orm";

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

    const conditions: (SQL | undefined)[] = [eq(events.status, effectiveStatus)];

    if (category && category !== "all") {
      conditions.push(eq(events.category, category));
    }

    if (communitySlug && communitySlug !== "all") {
      conditions.push(eq(communities.slug, communitySlug));
    }

    if (search && search.trim() !== "") {
      const searchTerm = search.trim();
      conditions.push(
        or(
          ilike(events.title, `%${searchTerm}%`),
          ilike(events.description, `%${searchTerm}%`),
          ilike(communities.name, `%${searchTerm}%`)
        )
      );
    }

    const rows = await withDbRetry((client) =>
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
        .where(and(...conditions))
        .orderBy(asc(events.startTime))
        .limit(limit)
        .offset(offset)
    );

    const formattedEvents = rows.map(formatCampusEvent);

    const headers: Record<string, string> = {};
    if (requestedStatus === "published") {
      headers["Cache-Control"] = "public, s-maxage=10, stale-while-revalidate=59";
    } else {
      headers["Cache-Control"] = "private, no-cache, no-store, must-revalidate";
    }

    return NextResponse.json({ events: formattedEvents }, { headers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
