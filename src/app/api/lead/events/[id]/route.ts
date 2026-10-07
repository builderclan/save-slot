import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { CampusEvent } from "@/types/database";
import { ProposeEventSchema } from "@/lib/validations";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session || (!session.isLead && !session.isAdmin)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { id } = await params;

    // Check if event exists and lead is authorized
    const existingRes = await query<CampusEvent>(
      "SELECT * FROM public.events WHERE id = $1;",
      [id]
    );

    if (existingRes.rows.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const existingEvent = existingRes.rows[0];

    // Authorize lead for this event's community
    if (
      !session.isAdmin &&
      !session.leadCommunities.some((c) => c.id === existingEvent.community_id)
    ) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to edit events for this community." },
        { status: 403 }
      );
    }

    // Published events cannot be modified directly by leads
    if (existingEvent.status === "published") {
      return NextResponse.json(
        { error: "Published events cannot be modified directly. Please contact a campus administrator." },
        { status: 400 }
      );
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = ProposeEventSchema.safeParse(rawBody);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Invalid event proposal data";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const {
      title,
      category,
      venueId,
      startTime,
      endTime,
      description,
      coverImageUrl,
      externalRegistrationUrl,
    } = parsed.data;

    // Retrieve venue information
    const venueRes = await query<{ name: string; campus_id: string }>(
      "SELECT name, campus_id FROM public.venues WHERE id = $1;",
      [venueId]
    );

    if (venueRes.rows.length === 0) {
      return NextResponse.json({ error: "Selected venue not found." }, { status: 404 });
    }

    const { name: venueName } = venueRes.rows[0];

    // Resubmitting a rejected event resets status to 'pending' and clears rejection_reason
    const updateSql = `
      UPDATE public.events
      SET
        title = $1,
        description = $2,
        category = $3,
        venue_id = $4,
        start_time = $5,
        end_time = $6,
        location_name = $7,
        cover_image_url = $8,
        external_registration_url = $9,
        status = 'pending',
        rejection_reason = NULL,
        reviewed_by = NULL,
        updated_at = NOW()
      WHERE id = $10
      RETURNING *;
    `;

    const updateRes = await query<CampusEvent>(updateSql, [
      title.trim(),
      description.trim(),
      category,
      venueId,
      new Date(startTime).toISOString(),
      new Date(endTime).toISOString(),
      venueName,
      coverImageUrl || null,
      externalRegistrationUrl || null,
      id,
    ]);

    return NextResponse.json({ success: true, event: updateRes.rows[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update event proposal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session || (!session.isLead && !session.isAdmin)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { id } = await params;

    // Check if event exists and lead is authorized
    const existingRes = await query<CampusEvent>(
      "SELECT id, community_id, status FROM public.events WHERE id = $1;",
      [id]
    );

    if (existingRes.rows.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const existingEvent = existingRes.rows[0];

    // Authorize lead for this event's community
    if (
      !session.isAdmin &&
      !session.leadCommunities.some((c) => c.id === existingEvent.community_id)
    ) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to withdraw events for this community." },
        { status: 403 }
      );
    }

    // Prevent deletion of published events
    if (existingEvent.status === "published") {
      return NextResponse.json(
        { error: "Published events cannot be withdrawn. Please request cancellation from administration." },
        { status: 400 }
      );
    }

    const delRes = await query(
      "DELETE FROM public.events WHERE id = $1 RETURNING id;",
      [id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ error: "Failed to withdraw event proposal" }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to withdraw event proposal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
