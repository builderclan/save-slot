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

    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = UpdateCommunityFullSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid community data" },
        { status: 400 }
      );
    }

    // Check existing community
    const existingRes = await query<Community>("SELECT * FROM public.communities WHERE id = $1;", [id]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }
    const currentComm = existingRes.rows[0];

    const { name, slug, category, description, logoUrl, website, instagram, leadUserId, status } = parsed.data;

    // Check slug collision if slug is being updated
    if (slug && slug !== currentComm.slug) {
      const slugCollision = await query(
        "SELECT id FROM public.communities WHERE campus_id = $1 AND slug = $2 AND id != $3;",
        [currentComm.campus_id, slug, id]
      );
      if (slugCollision.rows.length > 0) {
        return NextResponse.json(
          { error: `Slug '${slug}' is already taken by another community.` },
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
      if (slug !== undefined) {
        updates.push(`slug = $${idx++}`);
        values.push(slug.trim().toLowerCase());
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

        // Clean up outgoing organizers: if any organizer user no longer has any active club leads,
        // downgrade them to view-only student
        await client.query(
          `UPDATE public.users u
           SET role = 'student'
           WHERE u.role = 'organizer'
             AND NOT EXISTS (
               SELECT 1 FROM public.community_members cm
               WHERE cm.user_id = u.id AND cm.role = 'lead'
             );`
        );
      }

      return comm;
    });

    return NextResponse.json({ success: true, community: updatedCommunity });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update community";
    return NextResponse.json({ error: message }, { status: 500 });
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

    // Safety guard: Check for active or pending events scheduled by this community
    const activeEventsRes = await query<{ count: string; titles: string }>(
      `SELECT count(*)::text as count, string_agg(title, ', ') as titles
       FROM public.events 
       WHERE community_id = $1 AND status IN ('pending', 'published');`,
      [id]
    );

    const activeCount = parseInt(activeEventsRes.rows[0]?.count || "0", 10);
    if (activeCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete community: ${activeCount} upcoming or pending event(s) belong to it. Please reassign or conclude those events first, or change the community status to 'rejected'.`,
        },
        { status: 400 }
      );
    }

    const deleted = await withTransaction(async (client) => {
      // Detach any rejected or archived events before deletion
      await client.query("UPDATE public.events SET community_id = NULL WHERE community_id = $1;", [id]);
      // Remove memberships
      await client.query("DELETE FROM public.community_members WHERE community_id = $1;", [id]);
      // Delete community
      const res = await client.query("DELETE FROM public.communities WHERE id = $1 RETURNING id;", [id]);
      return res.rows.length > 0;
    });

    if (!deleted) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete community";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
