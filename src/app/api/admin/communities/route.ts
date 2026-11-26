import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { withDbRetry } from "@/lib/db";
import { communities, communityMembers, users, events } from "@/db/schema";
import { formatCommunity, formatAdminCommunity } from "@/db/adapters";
import { CreateCommunitySchema } from "@/lib/validations";
import { and, eq, inArray, asc, sql } from "drizzle-orm";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateCode(slug: string): string {
  return slug.replace(/[^a-z0-9]/gi, "").slice(0, 10).toUpperCase() || "COMM";
}

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session || (!session.isAdmin && !session.isPrincipal)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const [rows, ficRows] = await withDbRetry(async (client) => {
      const leadSubquery = client
        .selectDistinctOn([communityMembers.communityId], {
          communityId: communityMembers.communityId,
          userId: communityMembers.userId,
        })
        .from(communityMembers)
        .where(eq(communityMembers.role, "lead"))
        .orderBy(communityMembers.communityId, asc(communityMembers.createdAt))
        .as("cm_lead");

      return Promise.all([
        client
          .select({
            id: communities.id,
            name: communities.name,
            slug: communities.slug,
            code: communities.code,
            scope: communities.scope,
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
            eventCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM ${events} WHERE ${events.communityId} = ${communities.id} AND ${events.status} IN ('pending_stage2', 'pending_executive', 'published', 'pending_report_verification')), 0)`.mapWith(Number),
          })
          .from(communities)
          .leftJoin(leadSubquery, eq(leadSubquery.communityId, communities.id))
          .leftJoin(users, eq(users.id, leadSubquery.userId))
          .orderBy(asc(communities.name)),
        client
          .select({
            communityId: communityMembers.communityId,
            userId: users.id,
            fullName: users.fullName,
          })
          .from(communityMembers)
          .innerJoin(users, eq(users.id, communityMembers.userId))
          .where(eq(communityMembers.role, "fic")),
      ]);
    });

    const ficsByCommunity = new Map<string, { ids: string[]; names: string[] }>();
    for (const row of ficRows) {
      const entry = ficsByCommunity.get(row.communityId) ?? { ids: [], names: [] };
      entry.ids.push(row.userId);
      entry.names.push(row.fullName);
      ficsByCommunity.set(row.communityId, entry);
    }

    const formatted = rows.map((row) => {
      const fics = ficsByCommunity.get(row.id);
      return formatAdminCommunity({
        ...row,
        ficIds: fics?.ids ?? [],
        ficNames: fics?.names ?? [],
      });
    });

    return NextResponse.json({ communities: formatted });
  } catch (err: unknown) {
    console.error("[GET /api/admin/communities] Error:", err);
    return NextResponse.json({ error: "Failed to load communities" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || (!session.isAdmin && !session.isPrincipal)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = CreateCommunitySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid community data", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      name,
      category,
      scope,
      description,
      logoUrl,
      website,
      instagram,
      leadUserId,
      ficUserIds,
    } = parsed.data;
    const rawSlug = parsed.data.slug?.trim();
    const slug = rawSlug && rawSlug.length > 0 ? rawSlug.toLowerCase() : generateSlug(name);
    const rawCode = parsed.data.code?.trim();
    const code = rawCode && rawCode.length > 0 ? rawCode.toUpperCase() : generateCode(slug);

    if (!slug) {
      return NextResponse.json(
        { error: "Could not generate a valid slug from community name." },
        { status: 400 }
      );
    }

    if (leadUserId && leadUserId.trim().length > 0) {
      const [leadUserCheck] = await withDbRetry((client) =>
        client
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.id, leadUserId), inArray(users.role, ["lead", "staff"])))
          .limit(1)
      );
      if (!leadUserCheck) {
        return NextResponse.json(
          { error: "Assigned lead user must exist and hold a Lead or Staff account." },
          { status: 400 }
        );
      }
    }

    const createdCommunity = await withDbRetry(async (client) => {
      return await client.transaction(async (tx) => {
        const [comm] = await tx
          .insert(communities)
          .values({
            name: name.trim(),
            slug,
            code,
            scope: scope || "internal",
            category,
            description: description?.trim() || null,
            logoUrl: logoUrl?.trim() || null,
            website: website?.trim() || null,
            instagram: instagram?.trim() || null,
            status: "approved",
            createdBy: session.userId,
          })
          .returning();

        if (leadUserId && leadUserId.trim().length > 0) {
          await tx
            .insert(communityMembers)
            .values({
              communityId: comm.id,
              userId: leadUserId.trim(),
              role: "lead",
              status: "active",
            })
            .onConflictDoUpdate({
              target: [communityMembers.communityId, communityMembers.userId],
              set: { role: "lead", status: "active" },
            });
        }

        if (ficUserIds && ficUserIds.length > 0) {
          const uniqueFics = [...new Set(ficUserIds.filter((uid) => uid && uid !== leadUserId))];
          for (const ficId of uniqueFics) {
            await tx
              .insert(communityMembers)
              .values({
                communityId: comm.id,
                userId: ficId,
                role: "fic",
                status: "active",
              })
              .onConflictDoUpdate({
                target: [communityMembers.communityId, communityMembers.userId],
                set: { role: "fic", status: "active" },
              });
          }
        }

        return comm;
      });
    });

    return NextResponse.json(
      { success: true, community: formatCommunity(createdCommunity) },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      return NextResponse.json(
        { error: "A community with this slug or reference code already exists." },
        { status: 400 }
      );
    }
    console.error("[POST /api/admin/communities] Error:", err);
    return NextResponse.json({ error: "Failed to create community" }, { status: 500 });
  }
}
