import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/server/auth";
import { withDbRetry } from "@/lib/db";
import { eventMentors, eventStage2Approvals, events } from "@/db/schema";
import { formatCampusEvent } from "@/db/adapters";
import { WorkspaceEventSchema } from "@/lib/validations";
import { safeRevalidatePath } from "@/lib/revalidate";
import { assertVenueSlotAvailableForTx } from "@/server/conflicts";
import {
  buildStage2Entities,
  submitOrResubmitProposalToStage2Tx,
} from "@/server/workflows";
import {
  canAccessWorkspaceEvent,
  canManageHostOrigin,
  hasWorkspaceAccess,
  validateSubmissionPreconditions,
  verifyHostEntitiesExist,
} from "@/server/workspace";

const EDITABLE_STATUSES = [
  "draft",
  "rejected",
  "needs_reschedule",
  "pending_stage2",
] as const;
const DELETABLE_STATUSES = [
  "draft",
  "rejected",
  "needs_reschedule",
  "pending_stage2",
] as const;

export async function PUT(
  request: Request,
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
    const rawBody = await request.json().catch(() => null);
    const parsed = WorkspaceEventSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message || "Invalid proposal update data",
        },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const primaryCommunityId =
      data.originType === "community" ? data.communityId! : null;
    const primaryDepartmentId =
      data.originType === "department" ? data.departmentId! : null;

    if (
      !canManageHostOrigin(
        session,
        data.originType,
        primaryCommunityId,
        primaryDepartmentId,
      )
    ) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to assign this host." },
        { status: 403 },
      );
    }

    const isSubmitting = data.action !== "draft";
    const startDate = new Date(data.startTime);
    const endDate = new Date(data.endTime);

    if (isSubmitting) {
      const precheck = await withDbRetry((client) =>
        validateSubmissionPreconditions(client, session, startDate),
      );
      if (!precheck.ok) {
        return NextResponse.json(
          {
            error: precheck.error,
            code: precheck.code,
            ...(precheck.overdueReports
              ? { overdueReports: precheck.overdueReports }
              : {}),
          },
          { status: precheck.status },
        );
      }
    }

    const primaryHost =
      data.originType === "community"
        ? { entityType: "community" as const, id: primaryCommunityId! }
        : { entityType: "department" as const, id: primaryDepartmentId! };

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
          return {
            ok: false as const,
            status: 403,
            error: "Forbidden: You cannot modify this event proposal.",
          };
        }
        if (
          !EDITABLE_STATUSES.includes(
            existing.status as (typeof EDITABLE_STATUSES)[number],
          )
        ) {
          return {
            ok: false as const,
            status: 409,
            error: `Events in '${existing.status}' status cannot be edited directly.`,
          };
        }

        const missingErr = await verifyHostEntitiesExist(tx, [
          primaryHost,
          ...data.coHosts,
        ]);
        if (missingErr) {
          return { ok: false as const, status: 404, error: missingErr };
        }

        const slotCheck = await assertVenueSlotAvailableForTx(tx, {
          venueId: data.venueId,
          startTime: startDate,
          endTime: endDate,
          excludeEventId: id,
        });
        if (!slotCheck.ok) {
          if (slotCheck.reason === "venue_not_found") {
            return {
              ok: false as const,
              status: 404,
              error: "Selected venue not found.",
            };
          }
          if (slotCheck.reason === "venue_inactive") {
            return {
              ok: false as const,
              status: 400,
              error: "Selected venue is inactive.",
            };
          }
          return {
            ok: false as const,
            status: 409,
            error: slotCheck.collidingEvent
              ? `Venue conflict: "${slotCheck.collidingEvent.title}" overlaps this slot.`
              : "This venue is already booked for the selected slot.",
          };
        }

        await tx
          .update(events)
          .set({
            originType: data.originType,
            communityId: primaryCommunityId,
            departmentId: primaryDepartmentId,
            venueId: data.venueId,
            title: data.title.trim(),
            description: data.description.trim(),
            category: data.category,
            targetAudience: data.targetAudience,
            startTime: startDate,
            endTime: endDate,
            locationName: slotCheck.venueName,
            coverImageUrl: data.coverImageUrl || null,
            externalRegistrationUrl: data.externalRegistrationUrl || null,
            estimatedBudget: String(data.estimatedBudget ?? 0),
            fundingSource: data.fundingSource || "No Cost",
            status: isSubmitting ? "pending_stage2" : "draft",
            rejectionReason: null,
            reviewedBy: null,
            updatedAt: new Date(),
          })
          .where(eq(events.id, id));

        await tx
          .delete(eventMentors)
          .where(
            and(
              eq(eventMentors.eventId, id),
              eq(eventMentors.phase, "planned"),
            ),
          );
        if (data.mentors.length > 0) {
          await tx.insert(eventMentors).values(
            data.mentors.map((m) => ({
              eventId: id,
              name: m.name.trim(),
              roleTitle: m.roleTitle.trim(),
              organization: m.organization.trim(),
              mentorType: m.mentorType,
              phase: "planned",
            })),
          );
        }

        const stage2Entities = buildStage2Entities(primaryHost, data.coHosts);
        if (isSubmitting) {
          await submitOrResubmitProposalToStage2Tx(tx, {
            eventId: id,
            eventTitle: data.title.trim(),
            actorSession: session,
            stage2Entities,
          });
        } else {
          await tx
            .delete(eventStage2Approvals)
            .where(eq(eventStage2Approvals.eventId, id));
          if (stage2Entities.length > 0) {
            await tx.insert(eventStage2Approvals).values(
              stage2Entities.map((entity) => ({
                eventId: id,
                entityType: entity.entityType,
                departmentId: entity.departmentId,
                communityId: entity.communityId,
                isPrimary: entity.isPrimary,
                approvalStatus: "pending",
                reportVerifyStatus: "pending",
              })),
            );
          }
        }

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
        { error: result.error },
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
    console.error("[PUT /api/workspace/events/[id]] Error:", err);
    return NextResponse.json(
      { error: "Failed to update event proposal" },
      { status: 500 },
    );
  }
}

export async function DELETE(
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

    const [existing] = await withDbRetry((client) =>
      client
        .select({
          id: events.id,
          createdBy: events.createdBy,
          coordinatorId: events.coordinatorId,
          communityId: events.communityId,
          departmentId: events.departmentId,
          status: events.status,
        })
        .from(events)
        .where(eq(events.id, id))
        .limit(1),
    );

    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (!canAccessWorkspaceEvent(session, existing)) {
      return NextResponse.json(
        {
          error: "Forbidden: You are not authorized to withdraw this proposal.",
        },
        { status: 403 },
      );
    }
    if (
      !DELETABLE_STATUSES.includes(
        existing.status as (typeof DELETABLE_STATUSES)[number],
      )
    ) {
      return NextResponse.json(
        {
          error: `Events in '${existing.status}' status cannot be deleted. Cancel published events instead.`,
        },
        { status: 400 },
      );
    }

    const [deleted] = await withDbRetry((client) =>
      client
        .delete(events)
        .where(
          and(
            eq(events.id, id),
            inArray(events.status, [...DELETABLE_STATUSES]),
          ),
        )
        .returning({ id: events.id }),
    );

    if (!deleted) {
      return NextResponse.json(
        { error: "Event is no longer withdrawable." },
        { status: 404 },
      );
    }

    safeRevalidatePath("/lead");
    safeRevalidatePath("/hod");
    safeRevalidatePath("/fic");

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: unknown) {
    console.error("[DELETE /api/workspace/events/[id]] Error:", err);
    return NextResponse.json(
      { error: "Failed to withdraw proposal" },
      { status: 500 },
    );
  }
}
