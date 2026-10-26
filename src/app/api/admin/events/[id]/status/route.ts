import { NextResponse } from "next/server";
import { safeRevalidatePath } from "@/lib/revalidate";
import { getCurrentUser } from "@/lib/auth";
import { withDbRetry } from "@/lib/db";
import { events, venues } from "@/db/schema";
import { formatCampusEvent } from "@/db/adapters";
import { UpdateEventStatusSchema } from "@/lib/validations";
import { checkEventConflicts } from "@/lib/conflicts/engine";
import { and, eq, ne, lt, gt } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session || (!session.isAdmin && !session.isPrincipal)) {
      return NextResponse.json(
        { error: "Unauthorized access: Principal or Admin approval authority required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const campusId = session.profile.campus_id;
    if (!campusId) {
      return NextResponse.json({ error: "Campus association required" }, { status: 403 });
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = UpdateEventStatusSchema.safeParse(rawBody);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Invalid status payload";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { status, rejectionReason } = parsed.data;

    // Fetch target event details
    const [targetEvent] = await withDbRetry((client) =>
      client
        .select({
          id: events.id,
          venueId: events.venueId,
          startTime: events.startTime,
          endTime: events.endTime,
          title: events.title,
          targetAudience: events.targetAudience,
        })
        .from(events)
        .where(
          and(
            eq(events.id, id),
            eq(events.campusId, campusId)
          )
        )
        .limit(1)
    );

    if (!targetEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const startTimeStr =
      targetEvent.startTime instanceof Date
        ? targetEvent.startTime.toISOString()
        : String(targetEvent.startTime);
    const endTimeStr =
      targetEvent.endTime instanceof Date
        ? targetEvent.endTime.toISOString()
        : String(targetEvent.endTime);

    // Concurrency collision check: If publishing, compute safe-slots & check clashes
    if (status === "published" && targetEvent.venueId) {
      const conflictCheck = await checkEventConflicts({
        venueId: targetEvent.venueId,
        startTime: startTimeStr,
        endTime: endTimeStr,
        targetAudience: targetEvent.targetAudience || ["All Students"],
        excludeEventId: id,
      });

      if (conflictCheck.hasConflict) {
        return NextResponse.json(
          {
            error: `Cannot publish event: Venue collision detected. ${conflictCheck.message}`,
            conflict: conflictCheck,
          },
          { status: 409 }
        );
      }
    }

    // Atomic transaction commit with row-level locking
    const updatedEvent = await withDbRetry(async (client) => {
      return await client.transaction(async (tx) => {
        // Re-verify venue lock if publishing to protect against concurrent approvals
        if (status === "published" && targetEvent.venueId) {
          // Lock venue row to serialize concurrent approvals for this venue
          await tx
            .select({ id: venues.id })
            .from(venues)
            .where(eq(venues.id, targetEvent.venueId))
            .for("update");

          const raceCheck = await tx
            .select({ id: events.id, title: events.title })
            .from(events)
            .where(
              and(
                eq(events.venueId, targetEvent.venueId),
                eq(events.status, "published"),
                ne(events.id, id),
                lt(events.startTime, new Date(targetEvent.endTime)),
                gt(events.endTime, new Date(targetEvent.startTime))
              )
            )
            .for("update");

          if (raceCheck.length > 0) {
            throw new Error(`CONCURRENCY_COLLISION: ${raceCheck[0].title}`);
          }
        }

        const [res] = await tx
          .update(events)
          .set({
            status,
            rejectionReason: rejectionReason || null,
            reviewedBy: session.userId,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(events.id, id),
              eq(events.campusId, campusId)
            )
          )
          .returning();

        return res;
      });
    });

    if (!updatedEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    safeRevalidatePath("/");
    safeRevalidatePath("/admin");
    safeRevalidatePath("/lead");

    return NextResponse.json({ success: true, event: formatCampusEvent(updatedEvent) });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("CONCURRENCY_COLLISION:")) {
      return NextResponse.json(
        { error: `Cannot publish event: Concurrent approval clash detected.` },
        { status: 409 }
      );
    }
    console.error("[POST /api/admin/events/[id]/status] Error:", err);
    return NextResponse.json({ error: "Failed to update event status" }, { status: 500 });
  }
}

