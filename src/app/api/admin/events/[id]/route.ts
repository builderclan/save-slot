import { NextResponse } from "next/server";
import { safeRevalidatePath } from "@/lib/revalidate";
import { getCurrentUser } from "@/lib/auth";
import { withDbRetry } from "@/lib/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";

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
    const deleted = await withDbRetry((client) =>
      client
        .delete(events)
        .where(eq(events.id, id))
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
    const message = err instanceof Error ? err.message : "Failed to delete event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
