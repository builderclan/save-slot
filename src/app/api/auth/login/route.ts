import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { query } from "@/lib/db";
import { UserProfile } from "@/types/database";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Invalid credentials" },
        { status: 401 }
      );
    }

    // Fetch user profile from public.users
    const userRes = await query<UserProfile>(
      "SELECT id, email, full_name, role, campus_id FROM public.users WHERE id = $1;",
      [authData.user.id]
    );

    const profile = userRes.rows[0];
    const role = profile?.role || "student";
    const redirectUrl = role === "admin" ? "/admin" : role === "organizer" ? "/lead" : "/";

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
