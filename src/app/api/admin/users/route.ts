import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withDbRetry } from "@/lib/db";
import { users, communityMembers, communities } from "@/db/schema";
import { formatUser, formatAdminUser } from "@/db/adapters";
import { CreateUserSchema } from "@/lib/validations";
import { eq, desc, sql } from "drizzle-orm";

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

    const rows = await withDbRetry((client) => {
      const leadSubquery = client
        .select({
          userId: communityMembers.userId,
          communityId: sql<string>`(ARRAY_AGG(${communityMembers.communityId} ORDER BY ${communityMembers.createdAt} ASC))[1]`.as("community_id"),
          communityName: sql<string>`string_agg(${communities.name}, ', ' ORDER BY ${communities.name})`.as("community_name"),
        })
        .from(communityMembers)
        .innerJoin(communities, eq(communities.id, communityMembers.communityId))
        .where(eq(communityMembers.role, "lead"))
        .groupBy(communityMembers.userId)
        .as("user_leads");

      return client
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          role: users.role,
          avatarUrl: users.avatarUrl,
          campusId: users.campusId,
          createdAt: users.createdAt,
          communityId: leadSubquery.communityId,
          communityName: leadSubquery.communityName,
        })
        .from(users)
        .leftJoin(leadSubquery, eq(leadSubquery.userId, users.id))
        .where(eq(users.campusId, campusId))
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

    const body = await request.json();
    const parsed = CreateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid user details", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { fullName, email, password, role, communityId } = parsed.data;

    const normalizedEmail = email.trim().toLowerCase();
    const campusId = session.profile.campus_id;
    if (!campusId) {
      return NextResponse.json({ error: "Campus association required" }, { status: 403 });
    }

    // Check if user already exists
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

        // 1. Insert into auth.users with empty string tokens for GoTrue scanner compatibility
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

        // 2. Insert into auth.identities
        await tx.execute(
          sql`INSERT INTO auth.identities (
            id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
          )
          VALUES (
            gen_random_uuid(), ${newUserId}::uuid, jsonb_build_object('sub', ${newUserId}::text, 'email', ${normalizedEmail}::text),
            'email', ${newUserId}::text, NOW(), NOW(), NOW()
          )`
        );

        // 3. Insert into public.users
        const [insertedUser] = await tx
          .insert(users)
          .values({
            id: newUserId,
            email: normalizedEmail,
            fullName: fullName.trim(),
            role,
            campusId,
          })
          .returning();

        // 4. Assign community lead membership if provided
        if (communityId && role === "organizer") {
          await tx
            .insert(communityMembers)
            .values({
              communityId,
              userId: newUserId,
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
      return NextResponse.json(
        { error: "A user with this email already exists." },
        { status: 400 }
      );
    }
    console.error("[POST /api/admin/users] Error:", err);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
