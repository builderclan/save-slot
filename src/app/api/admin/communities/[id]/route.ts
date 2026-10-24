import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withDbRetry } from "@/lib/db";
import { communities, communityMembers, users, events } from "@/db/schema";
import { formatCommunity, formatAdminCommunity } from "@/db/adapters";
import { UpdateCommunityFullSchema } from "@/lib/validations";
import { and, eq, ne, or, isNull, inArray, notExists, asc, sql } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    const campusId = session.profile.campus_id;
    if (!campusId) {
      return NextResponse.json({ error: "Campus association required" }, { status: 403 });
    }
    const { id } = await params;

    const [community] = await withDbRetry(async (client) => {
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
        .where(
          and(
            eq(communities.id, id),
            eq(communities.campusId, campusId)
          )
        )
        .limit(1);
    });

    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, community: formatAdminCommunity(community) });
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
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    const campusId = session.profile.campus_id;
    if (!campusId) {
      return NextResponse.json({ error: "Campus association required" }, { status: 403 });
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

    // Check existing community scoped to campus
    const [currentComm] = await withDbRetry((client) =>
      client
        .select()
        .from(communities)
        .where(
          and(
            eq(communities.id, id),
            eq(communities.campusId, campusId)
          )
        )
        .limit(1)
    );

    if (!currentComm) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    const { name, slug, category, description, logoUrl, website, instagram, leadUserId, status } = parsed.data;
    const normalizedSlug = slug ? slug.trim().toLowerCase() : undefined;

    // Check slug collision if slug is being updated
    if (normalizedSlug && normalizedSlug !== currentComm.slug) {
      const slugCollision = await withDbRetry((client) =>
        client
          .select({ id: communities.id })
          .from(communities)
          .where(
            and(
              eq(communities.campusId, currentComm.campusId),
              eq(communities.slug, normalizedSlug),
              ne(communities.id, id)
            )
          )
          .limit(1)
      );

      if (slugCollision.length > 0) {
        return NextResponse.json(
          { error: `Slug '${normalizedSlug}' is already taken by another community.` },
          { status: 400 }
        );
      }
    }

    // If leadUserId is provided and not empty, verify user exists in campus and is eligible
    if (leadUserId && leadUserId.trim().length > 0) {
      const leadUserCheck = await withDbRetry((client) =>
        client
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.id, leadUserId),
              or(isNull(users.campusId), eq(users.campusId, currentComm.campusId)),
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

    const updatedCommunity = await withDbRetry(async (client) => {
      return await client.transaction(async (tx) => {
        const updateData: Partial<typeof communities.$inferInsert> = {};

        if (name !== undefined) updateData.name = name.trim();
        if (normalizedSlug !== undefined) updateData.slug = normalizedSlug;
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
            .where(
              and(
                eq(communities.id, id),
                eq(communities.campusId, campusId)
              )
            )
            .returning();
          comm = updated;
        }

        // Handle community lead reassignment
        if (leadUserId !== undefined) {
          const priorLeads = await tx
            .select({ userId: communityMembers.userId })
            .from(communityMembers)
            .where(and(eq(communityMembers.communityId, id), eq(communityMembers.role, "lead")));

          const outgoingLeadIds = priorLeads
            .map((r) => r.userId)
            .filter((uid) => uid !== leadUserId);

          if (!leadUserId || leadUserId.trim().length === 0) {
            await tx
              .delete(communityMembers)
              .where(and(eq(communityMembers.communityId, id), eq(communityMembers.role, "lead")));
          } else {
            const leadUpdateRes = await tx
              .update(users)
              .set({
                role: sql`CASE WHEN ${users.role} = 'student' THEN 'organizer' ELSE ${users.role} END`,
                campusId: sql`COALESCE(${users.campusId}, ${currentComm.campusId})`,
              })
              .where(
                and(
                  eq(users.id, leadUserId),
                  or(isNull(users.campusId), eq(users.campusId, currentComm.campusId))
                )
              )
              .returning({ id: users.id });

            if (leadUpdateRes.length === 0) {
              throw new Error("Assigned lead user does not exist in this campus or is not eligible.");
            }

            await tx
              .delete(communityMembers)
              .where(
                and(
                  eq(communityMembers.communityId, id),
                  eq(communityMembers.role, "lead"),
                  ne(communityMembers.userId, leadUserId)
                )
              );

            await tx
              .insert(communityMembers)
              .values({
                communityId: id,
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

          if (outgoingLeadIds.length > 0) {
            await tx
              .update(users)
              .set({ role: "student" })
              .where(
                and(
                  inArray(users.id, outgoingLeadIds),
                  eq(users.role, "organizer"),
                  notExists(
                    tx
                      .select()
                      .from(communityMembers)
                      .where(
                        and(
                          eq(communityMembers.userId, users.id),
                          eq(communityMembers.role, "lead")
                        )
                      )
                  )
                )
              );
          }
        }

        return comm;
      });
    });

    return NextResponse.json({ success: true, community: formatCommunity(updatedCommunity) });
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

    const campusId = session.profile.campus_id;
    if (!campusId) {
      return NextResponse.json({ error: "Campus association required" }, { status: 403 });
    }
    const { id } = await params;

    const result = await withDbRetry(async (client) => {
      return await client.transaction(async (tx) => {
        // 1. Lock and verify the community belongs to this campus
        const [comm] = await tx
          .select({ id: communities.id })
          .from(communities)
          .where(
            and(
              eq(communities.id, id),
              eq(communities.campusId, campusId)
            )
          )
          .for("update");

        if (!comm) {
          return { status: 404, error: "Community not found" } as const;
        }

        // 2. Safety guard: Check for active or pending events scheduled by this community
        const activeEvents = await tx
          .select({ id: events.id, title: events.title })
          .from(events)
          .where(
            and(
              eq(events.communityId, id),
              inArray(events.status, ["pending", "published"])
            )
          );

        if (activeEvents.length > 0) {
          return {
            status: 400,
            error: `Cannot delete community: ${activeEvents.length} upcoming or pending event(s) belong to it. Please reassign or conclude those events first, or change the community status to 'rejected'.`,
          } as const;
        }

        // 3. Capture outgoing leads before deleting memberships
        const priorLeads = await tx
          .select({ userId: communityMembers.userId })
          .from(communityMembers)
          .where(
            and(
              eq(communityMembers.communityId, id),
              eq(communityMembers.role, "lead")
            )
          );
        const outgoingLeadIds = priorLeads.map((r) => r.userId);

        // 4. Remove inactive events and memberships before deleting community.
        // Note: In database schema, events.community_id is NOT NULL with ON DELETE CASCADE,
        // so historical events cannot be orphaned with community_id = NULL.
        await tx.delete(events).where(eq(events.communityId, id));
        await tx.delete(communityMembers).where(eq(communityMembers.communityId, id));

        // 5. Delete community
        const deleted = await tx
          .delete(communities)
          .where(
            and(
              eq(communities.id, id),
              eq(communities.campusId, campusId)
            )
          )
          .returning({ id: communities.id });

        if (deleted.length === 0) {
          return { status: 404, error: "Community not found" } as const;
        }

        // 6. Downgrade former leads if they have no remaining active club leads
        if (outgoingLeadIds.length > 0) {
          await tx
            .update(users)
            .set({ role: "student" })
            .where(
              and(
                inArray(users.id, outgoingLeadIds),
                eq(users.role, "organizer"),
                notExists(
                  tx
                    .select()
                    .from(communityMembers)
                    .where(
                      and(
                        eq(communityMembers.userId, users.id),
                        eq(communityMembers.role, "lead")
                      )
                    )
                )
              )
            );
        }

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
