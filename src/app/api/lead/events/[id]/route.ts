import { NextResponse } from "next/server";
import { safeRevalidatePath } from "@/lib/revalidate";
import { getCurrentUser } from "@/lib/auth";
import { withDbRetry } from "@/lib/db";
import { events, venues } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { formatCampusEvent } from "@/db/adapters";
import { ProposeEventSchema } from "@/lib/validations";
import { checkEventConflicts } from "@/lib/conflicts/engine";

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
    const [existingEvent] = await withDbRetry((client) =>
      client
        .select()
        .from(events)
        .where(eq(events.id, id))
        .limit(1)
    );

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Authorize lead for this event's community
    if (
      !session.isAdmin &&
      !session.leadCommunities.some((c) => c.id === existingEvent.communityId)
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
      targetAudience,
      venueId,
      startTime,
      endTime,
      description,
      coverImageUrl,
      externalRegistrationUrl,
    } = parsed.data;

    // Retrieve venue information
    const [venue] = await withDbRetry((client) =>
      client
        .select({ name: venues.name })
        .from(venues)
        .where(eq(venues.id, venueId))
        .limit(1)
    );

    if (!venue) {
      return NextResponse.json({ error: "Selected venue not found." }, { status: 404 });
    }

    // Server-side venue collision guard (excluding the current event)
    const conflictCheck = await checkEventConflicts({
      venueId,
      startTime,
      endTime,
      category,
      targetAudience: targetAudience || ["All Students"],
      excludeEventId: id,
    });

    if (conflictCheck.hasVenueConflict) {
      return NextResponse.json(
        {
          error: "Conflict: This venue is already booked for the selected time slot.",
          conflict: conflictCheck,
        },
        { status: 409 }
      );
    }

    // Resubmitting a rejected event resets status to 'pending' and clears rejection_reason
    const [updated] = await withDbRetry((client) =>
      client
        .update(events)
        .set({
          title: title.trim(),
          description: description.trim(),
          category,
          targetAudience: targetAudience || ["All Students"],
          venueId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          locationName: venue.name,
          coverImageUrl: coverImageUrl || null,
          externalRegistrationUrl: externalRegistrationUrl || null,
          status: "pending",
          rejectionReason: null,
          reviewedBy: null,
          updatedAt: new Date(),
        })
        .where(and(eq(events.id, id), ne(events.status, "published")))
        .returning()
    );

    if (!updated) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    safeRevalidatePath("/");
    safeRevalidatePath("/lead");
    safeRevalidatePath("/admin");

    return NextResponse.json({ success: true, event: formatCampusEvent(updated) });
  } catch (err: unknown) {
    console.error("[PUT /api/lead/events/[id]] Error:", err);
    return NextResponse.json({ error: "Failed to update event proposal" }, { status: 500 });
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
    const [existingEvent] = await withDbRetry((client) =>
      client
        .select({
          id: events.id,
          communityId: events.communityId,
          status: events.status,
        })
        .from(events)
        .where(eq(events.id, id))
        .limit(1)
    );

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Authorize lead for this event's community
    if (
      !session.isAdmin &&
      !session.leadCommunities.some((c) => c.id === existingEvent.communityId)
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

    const [deleted] = await withDbRetry((client) =>
      client
        .delete(events)
        .where(and(eq(events.id, id), ne(events.status, "published")))
        .returning({ id: events.id })
    );

    if (!deleted) {
      return NextResponse.json(
        { error: "Event not found or no longer withdrawable" },
        { status: 404 }
      );
    }

    safeRevalidatePath("/");
    safeRevalidatePath("/lead");
    safeRevalidatePath("/admin");

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: unknown) {
    console.error("[DELETE /api/lead/events/[id]] Error:", err);
    return NextResponse.json({ error: "Failed to withdraw event proposal" }, { status: 500 });
  }
}
