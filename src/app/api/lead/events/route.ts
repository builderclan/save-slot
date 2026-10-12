import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withDbRetry } from "@/lib/db";
import { events, venues } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { formatCampusEvent } from "@/db/adapters";
import { ProposeEventSchema } from "@/lib/validations";

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
    if (!session || (!session.isLead && !session.isAdmin && !session.isPrincipal)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const communityIds = session.leadCommunities.map((c) => c.id);

    if (!session.isAdmin && !session.isPrincipal && communityIds.length === 0) {
      return NextResponse.json({ events: [] });
    }

    const rows = await withDbRetry((client) =>
      client.query.events.findMany({
        where:
          !session.isAdmin && !session.isPrincipal
            ? inArray(events.communityId, communityIds)
            : undefined,
        orderBy: [desc(events.startTime)],
        with: {
          community: {
            columns: {
              id: true,
              name: true,
              slug: true,
            },
          },
          venue: {
            columns: {
              id: true,
              name: true,
              building: true,
              capacity: true,
            },
          },
          reviewer: {
            columns: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      })
    );

    return NextResponse.json({ events: rows.map(formatCampusEvent) });
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

    const rawBody = await request.json().catch(() => null);
    const parsed = ProposeEventSchema.safeParse(rawBody);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Invalid event proposal data";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

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
    } = parsed.data;

    // Determine community id and enforce authorization if not admin
    let targetCommunityId = providedCommunityId;
    if (targetCommunityId) {
      if (!session.isAdmin && !session.leadCommunities.some((c) => c.id === targetCommunityId)) {
        return NextResponse.json(
          { error: "Forbidden: You are not authorized to propose events for this community." },
          { status: 403 }
        );
      }
    } else if (session.leadCommunities.length > 0) {
      targetCommunityId = session.leadCommunities[0].id;
    }

    if (!targetCommunityId) {
      return NextResponse.json(
        { error: "No community assigned to this lead." },
        { status: 400 }
      );
    }

    // Query venue info for location_name and campus_id
    const [venue] = await withDbRetry((client) =>
      client
        .select({
          name: venues.name,
          campusId: venues.campusId,
        })
        .from(venues)
        .where(eq(venues.id, venueId))
        .limit(1)
    );

    if (!venue) {
      return NextResponse.json({ error: "Selected venue not found." }, { status: 404 });
    }

    // Generate unique slug
    let baseSlug = slugify(title);
    if (!baseSlug) baseSlug = "campus-event";
    const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

    const [inserted] = await withDbRetry((client) =>
      client
        .insert(events)
        .values({
          campusId: venue.campusId,
          communityId: targetCommunityId,
          venueId,
          createdBy: session.userId,
          title: title.trim(),
          slug: uniqueSlug,
          description: description.trim(),
          category,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          locationName: venue.name,
          status: "pending",
          coverImageUrl: coverImageUrl || null,
          externalRegistrationUrl: externalRegistrationUrl || null,
        })
        .returning()
    );

    return NextResponse.json({ success: true, event: formatCampusEvent(inserted) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to submit event proposal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
