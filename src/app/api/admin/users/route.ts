import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { withDbRetry } from "@/lib/db";
import { users, communityMembers, communities, departments } from "@/db/schema";
import { formatUser, formatAdminUser } from "@/db/adapters";
import { CreateUserSchema } from "@/lib/validations";
import { eq, desc, sql } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session || (!session.isAdmin && !session.isPrincipal)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const rows = await withDbRetry((client) => {
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
        .orderBy(desc(users.createdAt));
    });

    return NextResponse.json({ users: rows.map(formatAdminUser) });
  } catch (err: unknown) {
    console.error("[GET /api/admin/users] Error:", err);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = CreateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid user details", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      fullName,
      email,
      password,
      role,
      designation,
      departmentId,
      communityId,
      communityMemberRole,
    } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    const [existing] = await withDbRetry((client) =>
      client
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1)
    );
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists." }, { status: 400 });
    }

    const createdUser = await withDbRetry(async (client) => {
      return client.transaction(async (tx) => {
        const newUserId = crypto.randomUUID();

        await tx.execute(
          sql`INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            is_super_admin, is_sso_user, is_anonymous, created_at, updated_at,
            confirmation_token, recovery_token, email_change_token_new, email_change,
            email_change_token_current, phone_change, phone_change_token
          )
          VALUES (
            ${newUserId}::uuid, '00000000-0000-0000-0000-000000000000',
            'authenticated', 'authenticated', ${normalizedEmail}, crypt(${password}, gen_salt('bf')),
            NOW(), '{"provider":"email","providers":["email"]}',
            jsonb_build_object('full_name', ${fullName.trim()}::text, 'role', ${role}::text),
            false, false, false, NOW(), NOW(),
            '', '', '', '', '', '', ''
          )`
        );

        await tx.execute(
          sql`INSERT INTO auth.identities (
            id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
          )
          VALUES (
            gen_random_uuid(), ${newUserId}::uuid, jsonb_build_object('sub', ${newUserId}::text, 'email', ${normalizedEmail}::text),
            'email', ${newUserId}::text, NOW(), NOW(), NOW()
          )`
        );

        const [insertedUser] = await tx
          .insert(users)
          .values({
            id: newUserId,
            email: normalizedEmail,
            fullName: fullName.trim(),
            role,
            designation: designation?.trim() || null,
            departmentId: departmentId?.trim() || null,
            isActive: true,
          })
          .returning();

        if (communityId && communityId.trim() !== "") {
          const memberRole =
            communityMemberRole || (role === "fic" ? "fic" : "lead");
          await tx
            .insert(communityMembers)
            .values({
              communityId: communityId.trim(),
              userId: newUserId,
              role: memberRole,
              status: "active",
            })
            .onConflictDoUpdate({
              target: [communityMembers.communityId, communityMembers.userId],
              set: { role: memberRole, status: "active" },
            });
        }

        return insertedUser;
      });
    });

    return NextResponse.json({ success: true, user: formatUser(createdUser) });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      return NextResponse.json({ error: "A user with this email already exists." }, { status: 400 });
    }
    console.error("[POST /api/admin/users] Error:", err);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
