import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { UpdateCommunityFullSchema } from "@/lib/validations";
import { Community } from "@/types/database";

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
    const existingRes = await query<Community>(
      "SELECT * FROM public.communities WHERE id = $1 AND ($2::uuid IS NULL OR campus_id = $2);",
      [id, campusId || null]
    );
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }
    const currentComm = existingRes.rows[0];

    const { name, slug, category, description, logoUrl, website, instagram, leadUserId, status } = parsed.data;

    const normalizedSlug = slug ? slug.trim().toLowerCase() : undefined;

    // Check slug collision if slug is being updated
    if (normalizedSlug && normalizedSlug !== currentComm.slug) {
      const slugCollision = await query(
        "SELECT id FROM public.communities WHERE campus_id = $1 AND slug = $2 AND id != $3;",
        [currentComm.campus_id, normalizedSlug, id]
      );
      if (slugCollision.rows.length > 0) {
        return NextResponse.json(
          { error: `Slug '${normalizedSlug}' is already taken by another community.` },
          { status: 400 }
        );
      }
    }

    // If leadUserId is provided and not empty, verify user exists in campus and is eligible
    if (leadUserId && leadUserId.trim().length > 0) {
      const leadUserCheck = await query<{ id: string }>(
        `SELECT id FROM public.users 
         WHERE id = $1 AND ($2::uuid IS NULL OR campus_id = $2) AND role = 'organizer';`,
        [leadUserId, campusId || null]
      );
      if (leadUserCheck.rows.length === 0) {
        return NextResponse.json(
          { error: "Assigned lead user does not exist in this campus or is not an organizer." },
          { status: 400 }
        );
      }
    }

    const updatedCommunity = await withTransaction(async (client) => {
      const updates: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (name !== undefined) {
        updates.push(`name = $${idx++}`);
        values.push(name.trim());
      }
      if (normalizedSlug !== undefined) {
        updates.push(`slug = $${idx++}`);
        values.push(normalizedSlug);
      }
      if (category !== undefined) {
        updates.push(`category = $${idx++}`);
        values.push(category);
      }
      if (description !== undefined) {
        updates.push(`description = $${idx++}`);
        values.push(description?.trim() || null);
      }
      if (logoUrl !== undefined) {
        updates.push(`logo_url = $${idx++}`);
        values.push(logoUrl?.trim() || null);
      }
      if (website !== undefined) {
        updates.push(`website = $${idx++}`);
        values.push(website?.trim() || null);
      }
      if (instagram !== undefined) {
        updates.push(`instagram = $${idx++}`);
        values.push(instagram?.trim() || null);
      }
      if (status !== undefined) {
        updates.push(`status = $${idx++}`);
        values.push(status);
      }

      let comm = currentComm;
      if (updates.length > 0) {
        values.push(id);
        const updateSql = `UPDATE public.communities SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *;`;
        const res = await client.query<Community>(updateSql, values);
        comm = res.rows[0];
      }

      // Handle community lead reassignment
      if (leadUserId !== undefined) {
        // Capture outgoing leads for this community before clearing
        const priorLeadsRes = await client.query<{ user_id: string }>(
          "SELECT user_id FROM public.community_members WHERE community_id = $1 AND role = 'lead';",
          [id]
        );
        const outgoingLeadIds = priorLeadsRes.rows
          .map((r) => r.user_id)
          .filter((uid) => uid !== leadUserId);

        if (!leadUserId || leadUserId.trim().length === 0) {
          // Clear lead role from current members
          await client.query(
            "DELETE FROM public.community_members WHERE community_id = $1 AND role = 'lead';",
            [id]
          );
        } else {
          // Upgrade user to organizer if currently student
          await client.query(
            "UPDATE public.users SET role = 'organizer' WHERE id = $1 AND role = 'student';",
            [leadUserId]
          );

          // Clear prior leads for this club
          await client.query(
            "DELETE FROM public.community_members WHERE community_id = $1 AND role = 'lead' AND user_id != $2;",
            [id, leadUserId]
          );

          // Insert or update new lead
          await client.query(
            `INSERT INTO public.community_members (id, community_id, user_id, role, status)
             VALUES (gen_random_uuid(), $1, $2, 'lead', 'active')
             ON CONFLICT (community_id, user_id) DO UPDATE SET role = 'lead', status = 'active';`,
            [id, leadUserId]
          );
        }

        // Downgrade only outgoing leads of this community who no longer have any active club leads
        if (outgoingLeadIds.length > 0) {
          await client.query(
            `UPDATE public.users u
             SET role = 'student'
             WHERE u.id = ANY($1::uuid[])
               AND u.role = 'organizer'
               AND NOT EXISTS (
                 SELECT 1 FROM public.community_members cm
                 WHERE cm.user_id = u.id AND cm.role = 'lead'
               );`,
            [outgoingLeadIds]
          );
        }
      }

      return comm;
    });

    return NextResponse.json({ success: true, community: updatedCommunity });
  } catch (err: unknown) {
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
    const { id } = await params;

    const result = await withTransaction(async (client) => {
      // 1. Lock and verify the community belongs to this campus
      const commRes = await client.query<{ id: string }>(
        "SELECT id FROM public.communities WHERE id = $1 AND ($2::uuid IS NULL OR campus_id = $2) FOR UPDATE;",
        [id, campusId || null]
      );
      if (commRes.rows.length === 0) {
        return { status: 404, error: "Community not found" } as const;
      }

      // 2. Safety guard: Check for active or pending events scheduled by this community
      const activeEventsRes = await client.query<{ count: string; titles: string }>(
        `SELECT count(*)::text as count, string_agg(title, ', ') as titles
         FROM public.events 
         WHERE community_id = $1 AND status IN ('pending', 'published');`,
        [id]
      );

      const activeCount = parseInt(activeEventsRes.rows[0]?.count || "0", 10);
      if (activeCount > 0) {
        return {
          status: 400,
          error: `Cannot delete community: ${activeCount} upcoming or pending event(s) belong to it. Please reassign or conclude those events first, or change the community status to 'rejected'.`,
        } as const;
      }

      // 3. Capture outgoing leads before deleting memberships
      const priorLeadsRes = await client.query<{ user_id: string }>(
        "SELECT user_id FROM public.community_members WHERE community_id = $1 AND role = 'lead';",
        [id]
      );
      const outgoingLeadIds = priorLeadsRes.rows.map((r) => r.user_id);

      // 4. Detach any rejected or archived events before deletion
      await client.query("UPDATE public.events SET community_id = NULL WHERE community_id = $1;", [id]);
      // 5. Remove memberships
      await client.query("DELETE FROM public.community_members WHERE community_id = $1;", [id]);
      // 6. Delete community
      const res = await client.query("DELETE FROM public.communities WHERE id = $1 RETURNING id;", [id]);
      if (res.rows.length === 0) {
        return { status: 404, error: "Community not found" } as const;
      }

      // 7. Downgrade former leads if they have no remaining active club leads
      if (outgoingLeadIds.length > 0) {
        await client.query(
          `UPDATE public.users u
           SET role = 'student'
           WHERE u.id = ANY($1::uuid[])
             AND u.role = 'organizer'
             AND NOT EXISTS (
               SELECT 1 FROM public.community_members cm
               WHERE cm.user_id = u.id AND cm.role = 'lead'
             );`,
          [outgoingLeadIds]
        );
      }
      return { status: 200, success: true } as const;
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
