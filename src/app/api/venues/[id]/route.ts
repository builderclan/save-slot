import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerAuthContext } from "@/lib/auth/server-auth";

interface RouteProps {
  params: Promise<{ id: string }>;
}

// PATCH /api/venues/[id]
export async function PATCH(request: NextRequest, { params }: RouteProps) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { id } = await params;
  const authContext = await getServerAuthContext();
  if (!authContext || !authContext.isCampusAdmin) {
    return NextResponse.json({ error: "Forbidden: Campus admin required" }, { status: 403 });
  }

  try {
    const { data: existing } = await supabase
      .from("venues")
      .select("campus_id")
      .eq("id", id)
      .single();

    if (!existing || existing.campus_id !== authContext.campus.id) {
      return NextResponse.json(
        { error: "Forbidden: You cannot modify venues of another campus." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.building !== undefined) updates.building = body.building.trim();
    if (body.capacity !== undefined) updates.capacity = body.capacity ? parseInt(body.capacity, 10) : null;
    if (body.address !== undefined) updates.address = body.address ? body.address.trim() : null;
    if (body.notes !== undefined) updates.notes = body.notes ? body.notes.trim() : null;
    if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);

    const { data: updatedVenue, error } = await supabase
      .from("venues")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ venue: updatedVenue });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
