import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerAuthContext } from "@/lib/auth/server-auth";

interface RouteProps {
  params: Promise<{ id: string }>;
}

// GET /api/events/[id]
export async function GET(request: NextRequest, { params }: RouteProps) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { id } = await params;

  try {
    // Check if ID is UUID or slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let query = supabase
      .from("events")
      .select("*, community:communities(*), venue:venues(*)");

    if (isUuid) {
      query = query.eq("id", id);
    } else {
      query = query.eq("slug", id);
    }

    const { data: event, error } = await query.single();

    if (error || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // If event is not published, ensure user has authorization to view it
    if (event.status !== "published") {
      const authContext = await getServerAuthContext();
      const isAllowed =
        authContext &&
        (authContext.isCampusAdmin || authContext.leadCommunityIds.includes(event.community_id));

      if (!isAllowed) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }
    }

    return NextResponse.json({ event });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/events/[id]
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
    // 1. Fetch current event to verify ownership and campus
    const { data: existing, error: findError } = await supabase
      .from("events")
      .select("*, community:communities(*)")
      .eq("id", id)
      .single();

    if (findError || !existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // 2. Authorization check: must lead this event's community OR be campus admin for this campus
    const isLead = authContext.leadCommunityIds.includes(existing.community_id);
    const isAdmin = authContext.isCampusAdmin && authContext.campus.id === existing.campus_id;

    if (!isLead && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to modify this event." },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Prevent tampering with campus_id or created_by
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.description !== undefined) updates.description = body.description.trim();
    if (body.category !== undefined) updates.category = body.category;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.start_time !== undefined) updates.start_time = body.start_time;
    if (body.end_time !== undefined) updates.end_time = body.end_time;
    if (body.venue_id !== undefined) updates.venue_id = body.venue_id || null;
    if (body.location_name !== undefined) updates.location_name = body.location_name;
    if (body.is_virtual !== undefined) updates.is_virtual = Boolean(body.is_virtual);
    if (body.virtual_link !== undefined) updates.virtual_link = body.virtual_link?.trim() || null;
    if (body.external_registration_url !== undefined) {
      updates.external_registration_url = body.external_registration_url?.trim() || null;
    }
    if (body.cover_image_url !== undefined) {
      updates.cover_image_url = body.cover_image_url?.trim() || null;
    }
    if (body.status !== undefined) updates.status = body.status;
    if (body.cancellation_reason !== undefined) updates.cancellation_reason = body.cancellation_reason;
    if (body.rejection_reason !== undefined) updates.rejection_reason = body.rejection_reason;

    // Execute update with Supabase RLS
    const { data: updatedEvent, error: updateError } = await supabase
      .from("events")
      .update(updates)
      .eq("id", id)
      .select("*, community:communities(*), venue:venues(*)")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ event: updatedEvent });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/events/[id]
export async function DELETE(request: NextRequest, { params }: RouteProps) {
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
    const { data: existing, error: findError } = await supabase
      .from("events")
      .select("*, community:communities(*)")
      .eq("id", id)
      .single();

    if (findError || !existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const isLead = authContext.leadCommunityIds.includes(existing.community_id);
    const isAdmin = authContext.isCampusAdmin && authContext.campus.id === existing.campus_id;

    if (!isLead && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Cancel event instead of hard delete to preserve history
    const { data: cancelledEvent, error } = await supabase
      .from("events")
      .update({
        status: "cancelled",
        cancellation_reason: "Cancelled by organizer",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ event: cancelledEvent });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
