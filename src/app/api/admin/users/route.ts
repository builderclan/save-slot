import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { UserProfile } from "@/types/database";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    const sql = `
      SELECT 
        u.id, u.email, u.full_name, u.role, u.campus_id, u.created_at,
        c.id as community_id, c.name as community_name, c.slug as community_slug
      FROM public.users u
      LEFT JOIN public.community_members cm ON cm.user_id = u.id AND cm.role = 'lead'
      LEFT JOIN public.communities c ON c.id = cm.community_id
      ORDER BY u.created_at DESC;
    `;

    const res = await query(sql);
    return NextResponse.json({ users: res.rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load users";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    const body = await request.json();
    const { fullName, email, password, role, communityId } = body;

    if (!fullName || !email || !password || !role) {
      return NextResponse.json(
        { error: "Full name, email, password, and role are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const campusId = session.profile.campus_id;

    // Check if user already exists
    const existing = await query("SELECT id FROM public.users WHERE email = $1;", [normalizedEmail]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "A user with this email already exists." }, { status: 400 });
    }

    // 1. Insert into auth.users with empty string tokens for GoTrue scanner compatibility
    const insAuth = await query<{ id: string }>(
      `INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        is_super_admin, is_sso_user, is_anonymous, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change,
        email_change_token_current, phone_change, phone_change_token
      )
      VALUES (
        gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', $1, crypt($2, gen_salt('bf')),
        NOW(), '{"provider":"email","providers":["email"]}',
        jsonb_build_object('full_name', $3::text, 'role', $4::text),
        false, false, false, NOW(), NOW(),
        '', '', '', '', '', '', ''
      )
      RETURNING id;`,
      [normalizedEmail, password, fullName.trim(), role]
    );

    const newUserId = insAuth.rows[0].id;

    // 2. Insert into auth.identities
    await query(
      `INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), $1::uuid, jsonb_build_object('sub', $2::text, 'email', $3::text),
        'email', $2::text, NOW(), NOW(), NOW()
      );`,
      [newUserId, newUserId, normalizedEmail]
    );

    // 3. Insert into public.users
    const insUser = await query<UserProfile>(
      `INSERT INTO public.users (id, email, full_name, role, campus_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *;`,
      [newUserId, normalizedEmail, fullName.trim(), role, campusId]
    );

    // 4. Assign community lead membership if provided
    if (communityId && role === "organizer") {
      await query(
        `INSERT INTO public.community_members (id, community_id, user_id, role, status)
         VALUES (gen_random_uuid(), $1, $2, 'lead', 'active')
         ON CONFLICT (community_id, user_id) DO UPDATE SET role = 'lead', status = 'active';`,
        [communityId, newUserId]
      );
    }

    return NextResponse.json({ success: true, user: insUser.rows[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
