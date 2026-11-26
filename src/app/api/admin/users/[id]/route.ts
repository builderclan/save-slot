import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { withDbRetry } from "@/lib/db";
import { users, communityMembers, communities, departments } from "@/db/schema";
import { formatAdminUser } from "@/db/adapters";
import { UpdateUserSchema } from "@/lib/validations";
import { eq, sql } from "drizzle-orm";

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

    const [userRow] = await withDbRetry((client) => {
      const memberSubquery = client
        .select({
          userId: communityMembers.userId,
          communityId: sql<string>`(ARRAY_AGG(${communityMembers.communityId} ORDER BY ${communityMembers.createdAt} ASC))[1]`.as("community_id"),
          communityName: sql<string>`string_agg(${communities.name}, ', ' ORDER BY ${communities.name})`.as("community_name"),
          communityMemberRole: sql<string>`(ARRAY_AGG(${communityMembers.role} ORDER BY ${communityMembers.createdAt} ASC))[1]`.as("community_member_role"),
        })
        .from(communityMembers)
        .innerJoin(communities, eq(communities.id, communityMembers.communityId))
        .groupBy(communityMembers.userId)
        .as("user_memberships");

      return client
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          role: users.role,
          designation: users.designation,
          departmentId: users.departmentId,
          avatarUrl: users.avatarUrl,
          isActive: users.isActive,
          createdAt: users.createdAt,
          departmentName: departments.name,
          departmentCode: departments.code,
          communityId: memberSubquery.communityId,
          communityName: memberSubquery.communityName,
          communityMemberRole: memberSubquery.communityMemberRole,
        })
        .from(users)
        .leftJoin(departments, eq(departments.id, users.departmentId))
        .leftJoin(memberSubquery, eq(memberSubquery.userId, users.id))
        .where(eq(users.id, id))
        .limit(1);
    });

    if (!userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: formatAdminUser(userRow) });
  } catch (err: unknown) {
    console.error("[GET /api/admin/users/[id]] Error:", err);
    return NextResponse.json({ error: "Failed to load user" }, { status: 500 });
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

    const {
      fullName,
      role,
      designation,
      departmentId,
      communityId,
      communityMemberRole,
      isActive,
    } = parsed.data;

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
        const userUpdates: Partial<typeof users.$inferInsert> = {};
        if (fullName !== undefined) userUpdates.fullName = fullName.trim();
        if (role !== undefined) userUpdates.role = role;
        if (designation !== undefined) userUpdates.designation = designation?.trim() || null;
        if (departmentId !== undefined) userUpdates.departmentId = departmentId?.trim() || null;
        if (isActive !== undefined) userUpdates.isActive = isActive;

        if (Object.keys(userUpdates).length > 0) {
          await tx.update(users).set(userUpdates).where(eq(users.id, id));

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

        const effectiveRole = role ?? existingUser.role;
        if (communityId !== undefined) {
          await tx.delete(communityMembers).where(eq(communityMembers.userId, id));
          if (communityId && communityId.trim() !== "") {
            const memberRole =
              communityMemberRole || (effectiveRole === "fic" ? "fic" : "lead");
            await tx
              .insert(communityMembers)
              .values({
                communityId: communityId.trim(),
                userId: id,
                role: memberRole,
                status: "active",
              })
              .onConflictDoUpdate({
                target: [communityMembers.communityId, communityMembers.userId],
                set: { role: memberRole, status: "active" },
              });
          }
        }
      });
    });

    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    console.error("[PATCH /api/admin/users/[id]] Error:", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
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

    if (session.userId === id) {
      return NextResponse.json(
        { error: "Cannot delete your own active administrator account." },
        { status: 400 }
      );
    }

    const [targetUser] = await withDbRetry((client) =>
      client.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, id)).limit(1)
    );

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await withDbRetry(async (client) => {
      return client.transaction(async (tx) => {
        await tx.delete(communityMembers).where(eq(communityMembers.userId, id));
        await tx.delete(users).where(eq(users.id, id));
        await tx.execute(sql`DELETE FROM auth.identities WHERE user_id = ${id}::uuid`);
        await tx.execute(sql`DELETE FROM auth.users WHERE id = ${id}::uuid`);
      });
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: unknown) {
    console.error("[DELETE /api/admin/users/[id]] Error:", err);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
