import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { UpdateUserSchema } from "@/lib/validations";

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
    const parsed = UpdateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid update data" },
        { status: 400 }
      );
    }

    const { fullName, role, communityId } = parsed.data;

    // Verify target user exists
    const userRes = await query("SELECT id, role, email FROM public.users WHERE id = $1;", [id]);
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await withTransaction(async (client) => {
      // 1. Update public.users
      if (fullName || role) {
        const updates: string[] = [];
        const values: unknown[] = [];
        let idx = 1;

        if (fullName) {
          updates.push(`full_name = $${idx++}`);
          values.push(fullName.trim());
        }
        if (role) {
          updates.push(`role = $${idx++}`);
          values.push(role);
        }

        values.push(id);
        await client.query(
          `UPDATE public.users SET ${updates.join(", ")} WHERE id = $${idx};`,
          values
        );

        // Update auth.users metadata if applicable
        if (role || fullName) {
          await client.query(
            `UPDATE auth.users 
             SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
               ${fullName ? "'full_name', $1::text," : ""}
               ${role ? "'role', $2::text" : ""}
             )
             WHERE id = $3;`,
            fullName && role ? [fullName.trim(), role, id] : fullName ? [fullName.trim(), id] : [role, id]
          ).catch(() => {
            // Non-critical if auth metadata update fails
          });
        }
      }

      // 2. Handle community assignment if organizer role or explicitly changed
      const effectiveRole = role || userRes.rows[0].role;
      if (effectiveRole === "organizer") {
        await client.query(
          "DELETE FROM public.community_members WHERE user_id = $1 AND role = 'lead';",
          [id]
        );
        if (communityId && communityId.trim() !== "") {
          await client.query(
            `INSERT INTO public.community_members (id, community_id, user_id, role, status)
             VALUES (gen_random_uuid(), $1, $2, 'lead', 'active');`,
            [communityId, id]
          );
        }
      } else {
        // Non-organizer roles should not have club lead associations
        await client.query(
          "DELETE FROM public.community_members WHERE user_id = $1 AND role = 'lead';",
          [id]
        );
      }
    });

    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    const { id } = await params;

    // Safety guard: Cannot delete self
    if (session.userId === id) {
      return NextResponse.json(
        { error: "Cannot delete your own active administrator account." },
        { status: 400 }
      );
    }

    const userRes = await query("SELECT id, email FROM public.users WHERE id = $1;", [id]);
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await withTransaction(async (client) => {
      // 1. Remove community memberships
      await client.query("DELETE FROM public.community_members WHERE user_id = $1;", [id]);
      // 2. Remove public.users profile
      await client.query("DELETE FROM public.users WHERE id = $1;", [id]);
      // 3. Remove auth.identities & auth.users
      await client.query("DELETE FROM auth.identities WHERE user_id = $1;", [id]);
      await client.query("DELETE FROM auth.users WHERE id = $1;", [id]);
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
