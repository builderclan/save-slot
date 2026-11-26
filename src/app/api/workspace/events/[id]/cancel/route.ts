import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/server/auth";
import { withDbRetry } from "@/lib/db";
import { events } from "@/db/schema";
import { formatCampusEvent } from "@/db/adapters";
import { CancelEventSchema } from "@/lib/validations";
import { safeRevalidatePath } from "@/lib/revalidate";
import { recordApprovalAudit } from "@/server/workflows";
import { dispatchNotifications, getStage2NotificationUserIds } from "@/server/notifications";
import { eventStage2Approvals } from "@/db/schema";
import { canAccessWorkspaceEvent, hasWorkspaceAccess } from "@/server/workspace";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session || !hasWorkspaceAccess(session)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { id } = await params;
    const rawBody = await request.json().catch(() => null);
    const parsed = CancelEventSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Cancellation reason is required" },
        { status: 400 }
      );
    }

    const reason = parsed.data.cancellationReason.trim();

    const result = await withDbRetry((client) =>
      client.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(events)
          .where(eq(events.id, id))
          .for("update")
          .limit(1);

        if (!existing) {
          return { ok: false as const, status: 404, error: "Event not found." };
        }
        if (!canAccessWorkspaceEvent(session, existing)) {
          return { ok: false as const, status: 403, error: "Forbidden." };
        }
        if (existing.status !== "published" && existing.status !== "needs_reschedule") {
          return {
            ok: false as const,
            status: 409,
            error: `Only published or reschedule-pending events can be cancelled (currently '${existing.status}').`,
          };
        }

        const [updated] = await tx
          .update(events)
          .set({
            status: "cancelled",
            cancellationReason: reason,
            updatedAt: new Date(),
          })
          .where(eq(events.id, id))
          .returning();

        await recordApprovalAudit(tx, {
          eventId: id,
          stage: "workspace",
          action: "cancelled",
          actorSession: session,
          remarks: reason,
        });

        const stage2Rows = await tx
          .select({
            entityType: eventStage2Approvals.entityType,
            departmentId: eventStage2Approvals.departmentId,
            communityId: eventStage2Approvals.communityId,
          })
          .from(eventStage2Approvals)
          .where(eq(eventStage2Approvals.eventId, id));

        const stage2Recipients = await getStage2NotificationUserIds(
          tx,
          stage2Rows.map((s) => ({
            entityType: s.entityType === "community" ? "community" : "department",
            departmentId: s.departmentId,
            communityId: s.communityId,
          }))
        );

        await dispatchNotifications(
          tx,
          stage2Recipients.map((userId) => ({
            userId,
            eventId: id,
            type: "event_cancelled",
            title: "Published Event Cancelled",
            message: `"${existing.title}" was cancelled by organizer: ${reason}`,
          }))
        );

        return { ok: true as const, event: updated };
      })
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    safeRevalidatePath("/");
    safeRevalidatePath("/lead");
    safeRevalidatePath("/principal");

    return NextResponse.json({ success: true, event: formatCampusEvent(result.event) });
  } catch (err: unknown) {
    console.error("[POST /api/workspace/events/[id]/cancel] Error:", err);
    return NextResponse.json({ error: "Failed to cancel event" }, { status: 500 });
  }
}
