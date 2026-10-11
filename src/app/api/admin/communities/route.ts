import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { AdminCommunityRow, Community } from "@/types/database";
import { CreateCommunitySchema } from "@/lib/validations";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    const campusId = session.profile.campus_id;

    const sql = `
      SELECT 
        c.id, c.campus_id, c.name, c.slug, c.category, c.description, c.logo_url, c.banner_url,
        c.website, c.instagram, c.status, c.created_at,
        u.id AS lead_id,
        u.full_name AS lead_name,
        u.email AS lead_email,
        COALESCE((SELECT COUNT(*)::int FROM public.community_members cm WHERE cm.community_id = c.id), 0) AS member_count,
        COALESCE((SELECT COUNT(*)::int FROM public.events e WHERE e.community_id = c.id AND e.status IN ('pending', 'published')), 0) AS event_count
      FROM public.communities c
      LEFT JOIN (
        SELECT DISTINCT ON (community_id) community_id, user_id 
        FROM public.community_members 
        WHERE role = 'lead'
        ORDER BY community_id, created_at ASC
      ) cm_lead ON cm_lead.community_id = c.id
      LEFT JOIN public.users u ON u.id = cm_lead.user_id
      WHERE ($1::uuid IS NULL OR c.campus_id = $1)
      ORDER BY c.name ASC;
    `;

    const res = await query<AdminCommunityRow>(sql, [campusId || null]);
    return NextResponse.json({ communities: res.rows });
  } catch (err: unknown) {
    console.error("[GET /api/admin/communities] Error:", err);
    return NextResponse.json({ error: "Failed to load communities" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    const campusId = session.profile.campus_id;
    if (!campusId) {
      return NextResponse.json(
        { error: "Admin profile is not associated with any campus." },
        { status: 400 }
      );
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = CreateCommunitySchema.safeParse(rawBody);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Invalid community data";
      return NextResponse.json({ error: errorMsg, details: parsed.error.issues }, { status: 400 });
    }

    const { name, category, description, logoUrl, website, instagram, leadUserId } = parsed.data;
    const rawSlug = parsed.data.slug?.trim();
    const slug = rawSlug && rawSlug.length > 0 ? rawSlug.toLowerCase() : generateSlug(name);

    if (!slug) {
      return NextResponse.json({ error: "Could not generate a valid slug from community name." }, { status: 400 });
    }

    // Check slug collision
    const existing = await query(
      "SELECT id FROM public.communities WHERE campus_id = $1 AND slug = $2;",
      [campusId, slug]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: `A community with slug '${slug}' already exists on this campus.` },
        { status: 400 }
      );
    }

    // If leadUserId is provided, verify they exist in this campus and hold an eligible role
    if (leadUserId && leadUserId.trim().length > 0) {
      const leadUserCheck = await query<{ id: string }>(
        `SELECT id FROM public.users 
         WHERE id = $1 AND campus_id = $2 AND role IN ('student', 'organizer');`,
        [leadUserId, campusId]
      );
      if (leadUserCheck.rows.length === 0) {
        return NextResponse.json(
          { error: "Assigned lead user does not exist in this campus or is not eligible." },
          { status: 400 }
        );
      }
    }

    const createdCommunity = await withTransaction(async (client) => {
      // 1. Insert community record
      const insRes = await client.query<Community>(
        `INSERT INTO public.communities (
          campus_id, name, slug, category, description, logo_url, website, instagram, status, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved', $9)
        RETURNING *;`,
        [
          campusId,
          name.trim(),
          slug,
          category,
          description?.trim() || null,
          logoUrl?.trim() || null,
          website?.trim() || null,
          instagram?.trim() || null,
          session.profile.id,
        ]
      );

      const comm = insRes.rows[0];

      // 2. Link community lead if provided
      if (leadUserId && leadUserId.trim().length > 0) {
        // Upgrade role to organizer if current role is student
        await client.query(
          "UPDATE public.users SET role = 'organizer' WHERE id = $1 AND role = 'student';",
          [leadUserId]
        );

        await client.query(
          `INSERT INTO public.community_members (id, community_id, user_id, role, status)
           VALUES (gen_random_uuid(), $1, $2, 'lead', 'active')
           ON CONFLICT (community_id, user_id) DO UPDATE SET role = 'lead', status = 'active';`,
          [comm.id, leadUserId]
        );
      }

      return comm;
    });

    return NextResponse.json({ success: true, community: createdCommunity }, { status: 201 });
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
    console.error("[POST /api/admin/communities] Error:", err);
    return NextResponse.json({ error: "Failed to create community" }, { status: 500 });
  }
}
