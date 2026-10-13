import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withDbRetry } from "@/lib/db";
import { users, communityMembers, communities } from "@/db/schema";
import { formatAdminUser } from "@/db/adapters";
import { UpdateUserSchema } from "@/lib/validations";
import { and, eq, sql } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    const { id } = await params;

    const [userRow] = await withDbRetry((client) =>
      client
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          role: users.role,
          avatarUrl: users.avatarUrl,
          campusId: users.campusId,
          createdAt: users.createdAt,
          communityId: sql<string | null>`(
            SELECT ${communityMembers.communityId}
            FROM ${communityMembers}
            WHERE ${communityMembers.userId} = ${users.id} AND ${communityMembers.role} = 'lead'
            ORDER BY ${communityMembers.createdAt} ASC
            LIMIT 1
          )`,
          communityName: sql<string | null>`(
            SELECT string_agg(${communities.name}, ', ' ORDER BY ${communities.name})
            FROM ${communityMembers}
            JOIN ${communities} ON ${communities.id} = ${communityMembers.communityId}
            WHERE ${communityMembers.userId} = ${users.id} AND ${communityMembers.role} = 'lead'
          )`,
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1)
    );

    if (!userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: formatAdminUser(userRow) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load user";
    return NextResponse.json({ error: message }, { status: 500 });
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
    const [existingUser] = await withDbRetry((client) =>
      client
        .select({ id: users.id, role: users.role, email: users.email })
        .from(users)
        .where(eq(users.id, id))
        .limit(1)
    );

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await withDbRetry(async (client) => {
      return client.transaction(async (tx) => {
        // 1. Update public.users
        const userUpdates: Partial<typeof users.$inferInsert> = {};
        if (fullName !== undefined) {
          userUpdates.fullName = fullName.trim();
        }
        if (role !== undefined) {
          userUpdates.role = role;
        }

        if (Object.keys(userUpdates).length > 0) {
          await tx
            .update(users)
            .set(userUpdates)
            .where(eq(users.id, id));

          // Update auth.users metadata if applicable
          const metaUpdates: Record<string, string> = {};
          if (fullName) metaUpdates.full_name = fullName.trim();
          if (role) metaUpdates.role = role;

          if (Object.keys(metaUpdates).length > 0) {
            const metaJson = JSON.stringify(metaUpdates);
            await tx
              .transaction((sp) =>
                sp.execute(
                  sql`UPDATE auth.users 
                      SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || ${metaJson}::jsonb 
                      WHERE id = ${id}::uuid`
                )
              )
              .catch(() => {
                // Non-critical: savepoint rollback keeps the outer transaction usable
              });
          }
        }

        // 2. Handle community assignment: only replace lead association if communityId is supplied, or clear if role changed away from organizer
        const effectiveRole = role ?? existingUser.role;
        if (effectiveRole === "organizer") {
          if (communityId !== undefined) {
            await tx
              .delete(communityMembers)
              .where(
                and(
                  eq(communityMembers.userId, id),
                  eq(communityMembers.role, "lead")
                )
              );

            if (communityId && communityId.trim() !== "") {
              await tx
                .insert(communityMembers)
                .values({
                  communityId: communityId.trim(),
                  userId: id,
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
          }
        } else if (role !== undefined && role !== "organizer") {
          // Non-organizer roles should not have club lead associations
          await tx
            .delete(communityMembers)
            .where(
              and(
                eq(communityMembers.userId, id),
                eq(communityMembers.role, "lead")
              )
            );
        }
      });
    });

    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update user";
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

    // Safety guard: Cannot delete self
    if (session.userId === id) {
      return NextResponse.json(
        { error: "Cannot delete your own active administrator account." },
        { status: 400 }
      );
    }

    const [targetUser] = await withDbRetry((client) =>
      client
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.id, id))
        .limit(1)
    );

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await withDbRetry(async (client) => {
      return client.transaction(async (tx) => {
        // 1. Remove community memberships
        await tx.delete(communityMembers).where(eq(communityMembers.userId, id));
        // 2. Remove public.users profile
        await tx.delete(users).where(eq(users.id, id));
        // 3. Remove auth.identities & auth.users
        await tx.execute(sql`DELETE FROM auth.identities WHERE user_id = ${id}::uuid`);
        await tx.execute(sql`DELETE FROM auth.users WHERE id = ${id}::uuid`);
      });
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
