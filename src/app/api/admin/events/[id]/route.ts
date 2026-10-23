import { NextResponse } from "next/server";
import { safeRevalidatePath } from "@/lib/revalidate";
import { getCurrentUser } from "@/lib/auth";
import { withDbRetry } from "@/lib/db";
import { events } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    const { id } = await params;
    const campusId = session.profile.campus_id;
    if (!campusId) {
      return NextResponse.json({ error: "Campus association required" }, { status: 403 });
    }

    const deleted = await withDbRetry((client) =>
      client
        .delete(events)
        .where(
          and(
            eq(events.id, id),
            eq(events.campusId, campusId)
          )
        )
        .returning({ id: events.id })
    );

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    safeRevalidatePath("/");
    safeRevalidatePath("/admin");
    safeRevalidatePath("/lead");

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: unknown) {
    console.error("[DELETE /api/admin/events/[id]] Error:", err);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
