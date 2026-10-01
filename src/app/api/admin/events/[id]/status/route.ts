import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, rejectionReason } = body;

    if (!["published", "rejected", "pending"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
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
