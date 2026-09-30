import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerAuthContext } from "@/lib/auth/server-auth";

interface RouteProps {
  params: Promise<{ id: string }>;
}

// GET /api/communities/[id]/members - list members
export async function GET(request: NextRequest, { params }: RouteProps) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { id } = await params;

  try {
    const { data: members, error } = await supabase
      .from("community_members")
      .select("*, user:users(*)")
      .eq("community_id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ members: members || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/communities/[id]/members - add/update member
export async function POST(request: NextRequest, { params }: RouteProps) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { id } = await params;
  const authContext = await getServerAuthContext();
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isLead = authContext.leadCommunityIds.includes(id);
  const isAdmin = authContext.isCampusAdmin;

  if (!isLead && !isAdmin) {
    return NextResponse.json({ error: "Forbidden: Only community leads or campus admins can manage members." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { user_id, role, status } = body;

    if (!user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    const { data: member, error } = await supabase
      .from("community_members")
      .upsert(
        {
          community_id: id,
          user_id,
          role: role || "member",
          status: status || "active",
        },
        { onConflict: "community_id,user_id" }
      )
      .select("*, user:users(*)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ member }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
