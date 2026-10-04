import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
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

    // Concurrency collision lock: If publishing, verify venue is free of clashes
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

    const sql = `
      UPDATE public.events
      SET status = $1, rejection_reason = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *;
    `;

    const res = await query(sql, [status, rejectionReason || null, id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, event: res.rows[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update event status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
