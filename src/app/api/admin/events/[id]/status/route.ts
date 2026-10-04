import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { UpdateEventStatusSchema } from "@/lib/validations";

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
