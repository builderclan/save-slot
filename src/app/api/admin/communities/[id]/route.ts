import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { withDbRetry } from "@/lib/db";
import { communities, communityMembers, users, events } from "@/db/schema";
import { formatCommunity, formatAdminCommunity } from "@/db/adapters";
import { UpdateCommunityFullSchema } from "@/lib/validations";
import { and, eq, ne, inArray, asc, sql } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session || (!session.isAdmin && !session.isPrincipal)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const { id } = await params;

    const [[community], ticRows] = await withDbRetry(async (client) => {
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
          .where(eq(communities.id, id))
          .limit(1),
        client
          .select({
            userId: users.id,
            fullName: users.fullName,
          })
          .from(communityMembers)
          .innerJoin(users, eq(users.id, communityMembers.userId))
          .where(and(eq(communityMembers.communityId, id), eq(communityMembers.role, "tic"))),
      ]);
    });

    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      community: formatAdminCommunity({
        ...community,
        ticIds: ticRows.map((t) => t.userId),
        ticNames: ticRows.map((t) => t.fullName),
      }),
    });
  } catch (err: unknown) {
    console.error("[GET /api/admin/communities/[id]] Error:", err);
    return NextResponse.json({ error: "Failed to load community" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session || (!session.isAdmin && !session.isPrincipal)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = UpdateCommunityFullSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid community data" },
        { status: 400 }
      );
    }

    const [currentComm] = await withDbRetry((client) =>
      client.select().from(communities).where(eq(communities.id, id)).limit(1)
    );

    if (!currentComm) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    const {
      name,
      slug,
      code,
      scope,
      category,
      description,
      logoUrl,
      website,
      instagram,
      leadUserId,
      ticUserIds,
      status,
    } = parsed.data;
    const normalizedSlug = slug ? slug.trim().toLowerCase() : undefined;
    const normalizedCode = code ? code.trim().toUpperCase() : undefined;

    if (normalizedSlug && normalizedSlug !== currentComm.slug) {
      const slugCollision = await withDbRetry((client) =>
        client
          .select({ id: communities.id })
          .from(communities)
          .where(and(eq(communities.slug, normalizedSlug), ne(communities.id, id)))
          .limit(1)
      );
      if (slugCollision.length > 0) {
        return NextResponse.json(
          { error: `Slug '${normalizedSlug}' is already taken by another community.` },
          { status: 400 }
        );
      }
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

    const updatedCommunity = await withDbRetry(async (client) => {
      return await client.transaction(async (tx) => {
        await tx
          .select({ id: communities.id })
          .from(communities)
          .where(eq(communities.id, id))
          .for("update");

        const updateData: Partial<typeof communities.$inferInsert> = {};

        if (name !== undefined) updateData.name = name.trim();
        if (normalizedSlug !== undefined) updateData.slug = normalizedSlug;
        if (normalizedCode !== undefined) updateData.code = normalizedCode;
        if (scope !== undefined) updateData.scope = scope;
        if (category !== undefined) updateData.category = category;
        if (description !== undefined) updateData.description = description?.trim() || null;
        if (logoUrl !== undefined) updateData.logoUrl = logoUrl?.trim() || null;
        if (website !== undefined) updateData.website = website?.trim() || null;
        if (instagram !== undefined) updateData.instagram = instagram?.trim() || null;
        if (status !== undefined) updateData.status = status;

        let comm = currentComm;
        if (Object.keys(updateData).length > 0) {
          const [updated] = await tx
            .update(communities)
            .set(updateData)
            .where(eq(communities.id, id))
            .returning();
          comm = updated;
        }

        if (leadUserId !== undefined) {
          if (!leadUserId || leadUserId.trim().length === 0) {
            await tx
              .delete(communityMembers)
              .where(and(eq(communityMembers.communityId, id), eq(communityMembers.role, "lead")));
          } else {
            await tx
              .delete(communityMembers)
              .where(
                and(
                  eq(communityMembers.communityId, id),
                  eq(communityMembers.role, "lead"),
                  ne(communityMembers.userId, leadUserId.trim())
                )
              );

            await tx
              .insert(communityMembers)
              .values({
                communityId: id,
                userId: leadUserId.trim(),
                role: "lead",
                status: "active",
              })
              .onConflictDoUpdate({
                target: [communityMembers.communityId, communityMembers.userId],
                set: { role: "lead", status: "active" },
              });
          }
        }

        if (ticUserIds !== undefined) {
          let effectiveLeadId: string | null =
            leadUserId !== undefined ? leadUserId?.trim() || null : null;

          if (leadUserId === undefined) {
            const [existingLead] = await tx
              .select({ userId: communityMembers.userId })
              .from(communityMembers)
              .where(
                and(eq(communityMembers.communityId, id), eq(communityMembers.role, "lead"))
              )
              .limit(1);
            effectiveLeadId = existingLead?.userId ?? null;
          }

          await tx
            .delete(communityMembers)
            .where(and(eq(communityMembers.communityId, id), eq(communityMembers.role, "tic")));

          const uniqueTics = [
            ...new Set(ticUserIds.filter((uid) => uid && uid !== effectiveLeadId)),
          ];
          for (const ticId of uniqueTics) {
            await tx
              .insert(communityMembers)
              .values({
                communityId: id,
                userId: ticId,
                role: "tic",
                status: "active",
              })
              .onConflictDoUpdate({
                target: [communityMembers.communityId, communityMembers.userId],
                set: { role: "tic", status: "active" },
              });
          }
        }

        return comm;
      });
    });

    return NextResponse.json({ success: true, community: formatCommunity(updatedCommunity) });
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
    console.error("[PATCH /api/admin/communities/[id]] Error:", err);
    return NextResponse.json({ error: "Failed to update community" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    const { id } = await params;

    const result = await withDbRetry(async (client) => {
      return await client.transaction(async (tx) => {
        const [comm] = await tx
          .select({ id: communities.id })
          .from(communities)
          .where(eq(communities.id, id))
          .for("update");

        if (!comm) {
          return { status: 404, error: "Community not found" } as const;
        }

        const activeEvents = await tx
          .select({ id: events.id })
          .from(events)
          .where(
            and(
              eq(events.communityId, id),
              inArray(events.status, [
                "pending_stage2",
                "pending_executive",
                "published",
                "pending_report_verification",
              ])
            )
          );

        if (activeEvents.length > 0) {
          return {
            status: 400,
            error: `Cannot delete community: ${activeEvents.length} active or pending event(s) belong to it.`,
          } as const;
        }

        await tx.delete(events).where(eq(events.communityId, id));
        await tx.delete(communityMembers).where(eq(communityMembers.communityId, id));
        await tx.delete(communities).where(eq(communities.id, id));

        return { status: 200, success: true } as const;
      });
    });

    if (result.status !== 200) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: unknown) {
    console.error("[DELETE /api/admin/communities/[id]] Error:", err);
    return NextResponse.json({ error: "Failed to delete community" }, { status: 500 });
  }
}
