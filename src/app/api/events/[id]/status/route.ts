import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerAuthContext } from "@/lib/auth/server-auth";
import { EventStatus } from "@/types/database";

interface RouteProps {
  params: Promise<{ id: string }>;
}

// POST /api/events/[id]/status
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

  try {
    const { data: event, error: findError } = await supabase
      .from("events")
      .select("*, community:communities(*)")
      .eq("id", id)
      .single();

    if (findError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const isLead = authContext.leadCommunityIds.includes(event.community_id);
    const isAdmin = authContext.isCampusAdmin && authContext.campus.id === event.campus_id;

    if (!isLead && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: You cannot modify this event status." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, reason } = body as {
      status: EventStatus;
      reason?: { rejection_reason?: string; cancellation_reason?: string };
    };

    // Rule enforcement:
    // Only Admin can reject
    if (status === "rejected" && !isAdmin) {
      return NextResponse.json(
        { error: "Only campus admins can reject event proposals." },
        { status: 403 }
      );
    }

    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (reason?.rejection_reason) {
      updates.rejection_reason = reason.rejection_reason;
    }
    if (reason?.cancellation_reason) {
      updates.cancellation_reason = reason.cancellation_reason;
    }

    const { data: updated, error: updateError } = await supabase
      .from("events")
      .update(updates)
      .eq("id", id)
      .select("*, community:communities(*), venue:venues(*)")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ event: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
