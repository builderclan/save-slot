import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerAuthContext } from "@/lib/auth/server-auth";

interface RouteProps {
  params: Promise<{ id: string }>;
}

// GET /api/communities/[id]
export async function GET(request: NextRequest, { params }: RouteProps) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { id } = await params;

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let query = supabase.from("communities").select("*");
    if (isUuid) {
      query = query.eq("id", id);
    } else {
      query = query.eq("slug", id);
    }

    const { data: community, error } = await query.single();
    if (error || !community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    return NextResponse.json({ community });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/communities/[id]
export async function PATCH(request: NextRequest, { params }: RouteProps) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { id } = await params;
  const authContext = await getServerAuthContext();
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: community, error: findError } = await supabase
      .from("communities")
      .select("*")
      .eq("id", id)
      .single();

    if (findError || !community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    const isLead = authContext.leadCommunityIds.includes(community.id);
    const isAdmin = authContext.isCampusAdmin && authContext.campus.id === community.campus_id;

    if (!isLead && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.category !== undefined) updates.category = body.category;
    if (body.description !== undefined) updates.description = body.description.trim();
    if (body.website !== undefined) updates.website = body.website?.trim() || null;
    if (body.instagram !== undefined) updates.instagram = body.instagram?.trim() || null;
    if (body.logo_url !== undefined) updates.logo_url = body.logo_url;

    // Only campus admin can approve or reject communities
    if (body.status !== undefined) {
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Only campus admins can change community approval status." },
          { status: 403 }
        );
      }
      updates.status = body.status;
    }

    const { data: updated, error } = await supabase
      .from("communities")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ community: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
