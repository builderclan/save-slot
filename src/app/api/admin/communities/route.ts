import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withDbRetry } from "@/lib/db";
import { communities, communityMembers, users, events } from "@/db/schema";
import { formatCommunity, formatAdminCommunity } from "@/db/adapters";
import { CreateCommunitySchema } from "@/lib/validations";
import { and, eq, or, isNull, asc, sql } from "drizzle-orm";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    const campusId = session.profile.campus_id;
    if (!campusId) {
      return NextResponse.json({ error: "Campus association required" }, { status: 403 });
    }

    const rows = await withDbRetry(async (client) => {
      const leadSubquery = client
        .selectDistinctOn([communityMembers.communityId], {
          communityId: communityMembers.communityId,
          userId: communityMembers.userId,
        })
        .from(communityMembers)
        .where(eq(communityMembers.role, "lead"))
        .orderBy(communityMembers.communityId, asc(communityMembers.createdAt))
        .as("cm_lead");

      return client
        .select({
          id: communities.id,
          campusId: communities.campusId,
          name: communities.name,
          slug: communities.slug,
          category: communities.category,
          description: communities.description,
          logoUrl: communities.logoUrl,
          bannerUrl: communities.bannerUrl,
          website: communities.website,
          instagram: communities.instagram,
          status: communities.status,
          createdAt: communities.createdAt,
          leadId: users.id,
          leadName: users.fullName,
          leadEmail: users.email,
          memberCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM ${communityMembers} WHERE ${communityMembers.communityId} = ${communities.id}), 0)`.mapWith(Number),
          eventCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM ${events} WHERE ${events.communityId} = ${communities.id} AND ${events.status} IN ('pending', 'published')), 0)`.mapWith(Number),
        })
        .from(communities)
        .leftJoin(leadSubquery, eq(leadSubquery.communityId, communities.id))
        .leftJoin(users, eq(users.id, leadSubquery.userId))
        .where(eq(communities.campusId, campusId))
        .orderBy(asc(communities.name));
    });

    return NextResponse.json({ communities: rows.map(formatAdminCommunity) });
  } catch (err: unknown) {
    console.error("[GET /api/admin/communities] Error:", err);
    return NextResponse.json({ error: "Failed to load communities" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    const campusId = session.profile.campus_id;
    if (!campusId) {
      return NextResponse.json({ error: "Campus association required" }, { status: 403 });
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = CreateCommunitySchema.safeParse(rawBody);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Invalid community data";
      return NextResponse.json({ error: errorMsg, details: parsed.error.issues }, { status: 400 });
    }

    const { name, category, description, logoUrl, website, instagram, leadUserId } = parsed.data;
    const rawSlug = parsed.data.slug?.trim();
    const slug = rawSlug && rawSlug.length > 0 ? rawSlug.toLowerCase() : generateSlug(name);

    if (!slug) {
      return NextResponse.json({ error: "Could not generate a valid slug from community name." }, { status: 400 });
    }

    // Check slug collision
    const existing = await withDbRetry((client) =>
      client
        .select({ id: communities.id })
        .from(communities)
        .where(and(eq(communities.campusId, campusId), eq(communities.slug, slug)))
        .limit(1)
    );
    if (existing.length > 0) {
      return NextResponse.json(
        { error: `A community with slug '${slug}' already exists on this campus.` },
        { status: 400 }
      );
    }

    // If leadUserId is provided, verify they exist in this campus and hold an eligible role
    if (leadUserId && leadUserId.trim().length > 0) {
      const leadUserCheck = await withDbRetry((client) =>
        client
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.id, leadUserId),
              or(isNull(users.campusId), eq(users.campusId, campusId)),
              eq(users.role, "organizer")
            )
          )
          .limit(1)
      );
      if (leadUserCheck.length === 0) {
        return NextResponse.json(
          { error: "Assigned lead user does not exist in this campus or is not an organizer." },
          { status: 400 }
        );
      }
    }

    const createdCommunity = await withDbRetry(async (client) => {
      return await client.transaction(async (tx) => {
        // 1. Insert community record
        const [comm] = await tx
          .insert(communities)
          .values({
            campusId,
            name: name.trim(),
            slug,
            category,
            description: description?.trim() || null,
            logoUrl: logoUrl?.trim() || null,
            website: website?.trim() || null,
            instagram: instagram?.trim() || null,
            status: "approved",
            createdBy: session.profile.id,
          })
          .returning();

        // 2. Link community lead if provided
        if (leadUserId && leadUserId.trim().length > 0) {
          const leadUpdateRes = await tx
            .update(users)
            .set({
              role: sql`CASE WHEN ${users.role} = 'student' THEN 'organizer' ELSE ${users.role} END`,
              campusId: sql`COALESCE(${users.campusId}, ${campusId})`,
            })
            .where(
              and(
                eq(users.id, leadUserId),
                or(isNull(users.campusId), eq(users.campusId, campusId))
              )
            )
            .returning({ id: users.id });

          if (leadUpdateRes.length === 0) {
            throw new Error("Assigned lead user does not exist in this campus or is not eligible.");
          }

          await tx
            .insert(communityMembers)
            .values({
              communityId: comm.id,
              userId: leadUserId,
              role: "lead",
              status: "active",
            })
            .onConflictDoUpdate({
              target: [communityMembers.communityId, communityMembers.userId],
              set: {
                role: "lead",
                status: "active",
              },
            });
        }

        return comm;
      });
    });

    return NextResponse.json(
      { success: true, community: formatCommunity(createdCommunity) },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("Assigned lead user")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      return NextResponse.json(
        { error: "A community with this slug already exists." },
        { status: 400 }
      );
    }
    console.error("[POST /api/admin/communities] Error:", err);
    return NextResponse.json({ error: "Failed to create community" }, { status: 500 });
  }
}
