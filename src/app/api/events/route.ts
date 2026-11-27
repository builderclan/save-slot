import { NextResponse } from "next/server";
import { withDbRetry } from "@/lib/db";
import {
  events,
  communities,
  departments,
  venues,
  users,
  communityMembers,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { formatCampusEvent } from "@/db/adapters";
import {
  eq,
  and,
  or,
  ilike,
  asc,
  getTableColumns,
  SQL,
  aliasedTable,
  sql,
  inArray,
} from "drizzle-orm";

const creators = aliasedTable(users, "creators");
const reviewers = aliasedTable(users, "reviewers");

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const communitySlug = searchParams.get("community");
    const originType = searchParams.get("originType");
    const communityScope = searchParams.get("communityScope");
    const departmentId = searchParams.get("departmentId");
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
    const limit =
      isNaN(rawLimit) || rawLimit < 1 ? 150 : Math.min(rawLimit, 300);
    const rawOffset = parseInt(searchParams.get("offset") || "0", 10);
    const offset = isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset;

    const conditions: (SQL | undefined)[] = [];
    if (effectiveStatus === "published") {
      conditions.push(
        inArray(events.status, [
          "published",
          "pending_report_verification",
          "completed",
        ]),
      );
    } else if (effectiveStatus !== "all") {
      conditions.push(eq(events.status, effectiveStatus));
    }

    if (category && category !== "all") {
      conditions.push(eq(events.category, category));
    }

    if (communitySlug && communitySlug !== "all") {
      conditions.push(eq(communities.slug, communitySlug));
    }

    if (originType && originType !== "all") {
      conditions.push(eq(events.originType, originType));
    }

    if (communityScope && (communityScope === "internal" || communityScope === "external")) {
      conditions.push(eq(events.originType, "community"));
      conditions.push(eq(communities.scope, communityScope));
    }

    if (departmentId && departmentId !== "all") {
      conditions.push(eq(events.departmentId, departmentId));
    }

    if (search && search.trim() !== "") {
      const searchTerm = search.trim();
      conditions.push(
        or(
          ilike(events.title, `%${searchTerm}%`),
          ilike(events.description, `%${searchTerm}%`),
          ilike(events.referenceNumber, `%${searchTerm}%`),
          ilike(communities.name, `%${searchTerm}%`),
          ilike(departments.name, `%${searchTerm}%`),
        ),
      );
    }

    const rows = await withDbRetry((client) =>
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
            leadName: sql<
              string | null
            >`(SELECT u.full_name FROM ${communityMembers} cm JOIN ${users} u ON u.id = cm.user_id WHERE cm.community_id = ${communities.id} AND cm.role = 'lead' LIMIT 1)`,
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
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(events.startTime))
        .limit(limit)
        .offset(offset),
    );

    const formattedEvents = rows.map(formatCampusEvent);

    const headers: Record<string, string> = {};
    if (requestedStatus === "published") {
      headers["Cache-Control"] =
        "public, s-maxage=10, stale-while-revalidate=59";
    } else {
      headers["Cache-Control"] = "private, no-cache, no-store, must-revalidate";
    }

    return NextResponse.json({ events: formattedEvents }, { headers });
  } catch (err: unknown) {
    console.error("[GET /api/events] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 },
    );
  }
}
