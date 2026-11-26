import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/server/auth";
import { withDbRetry } from "@/lib/db";
import { eventStage2Approvals, events } from "@/db/schema";
import { formatCampusEvent } from "@/db/adapters";
import { safeRevalidatePath } from "@/lib/revalidate";
import { assertVenueSlotAvailableForTx } from "@/server/conflicts";
import {
  buildStage2Entities,
  submitOrResubmitProposalToStage2Tx,
} from "@/server/workflows";
import {
  canAccessWorkspaceEvent,
  hasWorkspaceAccess,
  validateSubmissionPreconditions,
} from "@/server/workspace";

const SUBMITTABLE_STATUSES = ["draft", "rejected", "needs_reschedule"] as const;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getCurrentUser();
    if (!session || !hasWorkspaceAccess(session)) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 },
      );
    }

    const { id } = await params;

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
        if (
          !SUBMITTABLE_STATUSES.includes(
            existing.status as (typeof SUBMITTABLE_STATUSES)[number],
          )
        ) {
          return {
            ok: false as const,
            status: 409,
            error: `Only draft, rejected, or bumped events can be submitted (currently '${existing.status}').`,
          };
        }

        const precheck = await validateSubmissionPreconditions(
          tx,
          session,
          existing.startTime,
        );
        if (!precheck.ok) {
          return {
            ok: false as const,
            status: precheck.status,
            error: precheck.error,
            code: precheck.code,
            overdueReports: precheck.overdueReports,
          };
        }

        if (existing.venueId) {
          const slotCheck = await assertVenueSlotAvailableForTx(tx, {
            venueId: existing.venueId,
            startTime: existing.startTime,
            endTime: existing.endTime,
            excludeEventId: id,
          });
          if (!slotCheck.ok) {
            return {
              ok: false as const,
              status: 409,
              error: slotCheck.collidingEvent
                ? `Venue conflict: "${slotCheck.collidingEvent.title}" overlaps this slot.`
                : "Target venue is unavailable for this slot.",
            };
          }
        }

        const existingStage2 = await tx
          .select()
          .from(eventStage2Approvals)
          .where(eq(eventStage2Approvals.eventId, id));

        const primaryHost =
          existing.originType === "department" && existing.departmentId
            ? { entityType: "department" as const, id: existing.departmentId }
            : existing.communityId
              ? { entityType: "community" as const, id: existing.communityId }
              : null;

        if (!primaryHost) {
          return {
            ok: false as const,
            status: 400,
            error:
              "Primary Community or Department host is required before submitting.",
          };
        }

        const coHosts = existingStage2
          .filter((row) => !row.isPrimary)
          .map((row) => ({
            entityType: (row.entityType === "community"
              ? "community"
              : "department") as "department" | "community",
            id:
              (row.entityType === "community"
                ? row.communityId
                : row.departmentId) || "",
          }))
          .filter((c) => Boolean(c.id));

        await submitOrResubmitProposalToStage2Tx(tx, {
          eventId: id,
          eventTitle: existing.title,
          actorSession: session,
          stage2Entities: buildStage2Entities(primaryHost, coHosts),
        });

        const [updated] = await tx
          .select()
          .from(events)
          .where(eq(events.id, id))
          .limit(1);
        return { ok: true as const, event: updated };
      }),
    );

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          ...("code" in result && result.code ? { code: result.code } : {}),
          ...("overdueReports" in result && result.overdueReports
            ? { overdueReports: result.overdueReports }
            : {}),
        },
        { status: result.status },
      );
    }

    safeRevalidatePath("/lead");
    safeRevalidatePath("/hod");
    safeRevalidatePath("/fic");

    return NextResponse.json({
      success: true,
      event: formatCampusEvent(result.event),
    });
  } catch (err: unknown) {
    console.error("[POST /api/workspace/events/[id]/submit] Error:", err);
    return NextResponse.json(
      { error: "Failed to submit proposal" },
      { status: 500 },
    );
  }
}
