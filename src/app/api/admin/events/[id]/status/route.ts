import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { UpdateEventStatusSchema } from "@/lib/validations";
import { checkEventConflicts } from "@/lib/conflicts/engine";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session || (!session.isAdmin && !session.isPrincipal)) {
      return NextResponse.json({ error: "Unauthorized access: Principal or Admin approval authority required" }, { status: 403 });
    }

    const { id } = await params;
    const rawBody = await request.json().catch(() => null);
    const parsed = UpdateEventStatusSchema.safeParse(rawBody);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Invalid status payload";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { status, rejectionReason } = parsed.data;

    // Fetch target event details
    const targetEventRes = await query<{
      id: string;
      venue_id: string | null;
      start_time: string;
      end_time: string;
      title: string;
    }>(
      "SELECT id, venue_id, start_time, end_time, title FROM public.events WHERE id = $1;",
      [id]
    );

    if (targetEventRes.rows.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const targetEvent = targetEventRes.rows[0];

    // Concurrency collision check: If publishing, compute safe-slots & check clashes
    if (status === "published" && targetEvent.venue_id) {
      const conflictCheck = await checkEventConflicts({
        venueId: targetEvent.venue_id,
        startTime: targetEvent.start_time,
        endTime: targetEvent.end_time,
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
    const updatedEvent = await withTransaction(async (client) => {
      // Re-verify venue lock if publishing to protect against concurrent approvals
      if (status === "published" && targetEvent.venue_id) {
        const raceCheck = await client.query<{ id: string; title: string }>(
          `SELECT id, title FROM public.events
           WHERE venue_id = $1
             AND status = 'published'
             AND id != $2
             AND start_time < $4
             AND end_time > $3
           FOR UPDATE;`,
          [targetEvent.venue_id, id, targetEvent.start_time, targetEvent.end_time]
        );

        if (raceCheck.rows.length > 0) {
          throw new Error(`CONCURRENCY_COLLISION: ${raceCheck.rows[0].title}`);
        }
      }

      const res = await client.query(
        `UPDATE public.events
         SET status = $1, rejection_reason = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *;`,
        [status, rejectionReason || null, id]
      );

      return res.rows[0];
    });

    if (!updatedEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, event: updatedEvent });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("CONCURRENCY_COLLISION:")) {
      return NextResponse.json(
        { error: `Cannot publish event: Concurrent approval clash detected.` },
        { status: 409 }
      );
    }
    const message = err instanceof Error ? err.message : "Failed to update event status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

