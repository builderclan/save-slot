import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerAuthContext } from "@/lib/auth/server-auth";

// GET /api/auth/session
export async function GET() {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext) {
      return NextResponse.json({ authenticated: false, user: null, campus: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: authContext.profile,
      campus: authContext.campus,
      memberships: authContext.memberships,
      isCampusAdmin: authContext.isCampusAdmin,
      leadCommunityIds: authContext.leadCommunityIds,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/auth/session - sign in with official Supabase auth
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.session) {
      return NextResponse.json({ error: error?.message || "Invalid credentials" }, { status: 401 });
    }

    const authContext = await getServerAuthContext();

    return NextResponse.json({
      success: true,
      user: authContext?.profile || data.user,
      campus: authContext?.campus,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/auth/session - sign out
export async function DELETE() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    await supabase.auth.signOut();
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
