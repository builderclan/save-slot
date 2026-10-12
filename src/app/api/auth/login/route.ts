import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { query } from "@/lib/db";
import { getPrimaryCampusId } from "@/lib/campus";
import { UserProfile } from "@/types/database";
import { LoginSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => null);
    const parsed = LoginSchema.safeParse(rawBody);

    if (!parsed.success) {
      const errorMessage = parsed.error.issues[0]?.message || "Invalid login credentials";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const { email, password } = parsed.data;

    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Fetch user profile from public.users
    const userRes = await query<UserProfile>(
      "SELECT id, email, full_name, role, campus_id FROM public.users WHERE id = $1;",
      [authData.user.id]
    );

    const profile = userRes.rows[0];

    // Self-heal: ensure user is bound to the primary campus (AISAT) upon login
    if (profile && !profile.campus_id) {
      try {
        const primaryCampusId = await getPrimaryCampusId();
        if (primaryCampusId) {
          await query(
            "UPDATE public.users SET campus_id = $1 WHERE id = $2 AND campus_id IS NULL;",
            [primaryCampusId, profile.id]
          );
        }
      } catch (healErr) {
        console.error("[login] Campus self-heal non-blocking error:", healErr);
      }
    }

    let role = profile?.role || "student";

    // If not flagged as admin/principal/vice_principal/organizer directly, check community_members
    if (
      role !== "admin" &&
      role !== "principal" &&
      role !== "vice_principal" &&
      role !== "organizer"
    ) {
      const commCheck = await query(
        "SELECT 1 FROM public.community_members WHERE user_id = $1 AND role = 'lead' AND status = 'active' LIMIT 1;",
        [authData.user.id]
      );
      if (commCheck.rows.length > 0) {
        role = "organizer";
      }
    }

    const redirectUrl =
      role === "principal" || role === "vice_principal"
        ? "/principal"
        : role === "admin"
        ? "/admin"
        : role === "organizer"
        ? "/lead"
        : "/";

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        fullName: profile?.full_name,
        role,
      },
      redirectUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
