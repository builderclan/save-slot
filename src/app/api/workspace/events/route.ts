import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/server/auth";
import { withDbRetry } from "@/lib/db";
import { eventMentors, eventStage2Approvals, events } from "@/db/schema";
import { formatCampusEvent } from "@/db/adapters";
import { WorkspaceEventSchema } from "@/lib/validations";
import { safeRevalidatePath } from "@/lib/revalidate";
import { getOverdueClosureEvents } from "@/server/reports/overdue";
import { assertVenueSlotAvailableForTx } from "@/server/conflicts";
import {
  buildStage2Entities,
  submitOrResubmitProposalToStage2Tx,
} from "@/server/workflows";
import {
  canManageHostOrigin,
  fetchWorkspaceEvents,
  hasWorkspaceAccess,
  slugifyTitle,
  validateSubmissionPreconditions,
  verifyHostEntitiesExist,
} from "@/server/workspace";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session || !hasWorkspaceAccess(session)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const [rows, overdueReports] = await withDbRetry((client) =>
      Promise.all([
        fetchWorkspaceEvents(client, session),
        getOverdueClosureEvents(client, session.userId),
      ])
    );

    return NextResponse.json({
      events: rows.map(formatCampusEvent),
      overdueReports,
    });
  } catch (err: unknown) {
    console.error("[GET /api/workspace/events] Error:", err);
    return NextResponse.json(
      { error: "Failed to load workspace events" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || !hasWorkspaceAccess(session)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = WorkspaceEventSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid event proposal data" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const primaryCommunityId = data.originType === "community" ? data.communityId! : null;
    const primaryDepartmentId = data.originType === "department" ? data.departmentId! : null;

    if (!canManageHostOrigin(session, data.originType, primaryCommunityId, primaryDepartmentId)) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to propose events for this host." },
        { status: 403 }
      );
    }

    const isSubmitting = data.action !== "draft";
    const startDate = new Date(data.startTime);
    const endDate = new Date(data.endTime);

    if (isSubmitting) {
      const precheck = await withDbRetry((client) =>
        validateSubmissionPreconditions(client, session, startDate)
      );
      if (!precheck.ok) {
        return NextResponse.json(
          {
            error: precheck.error,
            code: precheck.code,
            ...(precheck.overdueReports ? { overdueReports: precheck.overdueReports } : {}),
          },
          { status: precheck.status }
        );
      }
    }

    const primaryHost =
      data.originType === "community"
        ? { entityType: "community" as const, id: primaryCommunityId! }
        : { entityType: "department" as const, id: primaryDepartmentId! };

    const result = await withDbRetry((client) =>
      client.transaction(async (tx) => {
        const missingErr = await verifyHostEntitiesExist(tx, [primaryHost, ...data.coHosts]);
        if (missingErr) {
          return { ok: false as const, status: 404, error: missingErr };
        }

        const slotCheck = await assertVenueSlotAvailableForTx(tx, {
          venueId: data.venueId,
          startTime: startDate,
          endTime: endDate,
        });

        if (!slotCheck.ok) {
          if (slotCheck.reason === "venue_not_found") {
            return { ok: false as const, status: 404, error: "Selected venue not found." };
          }
          if (slotCheck.reason === "venue_inactive") {
            return { ok: false as const, status: 400, error: "Selected venue is inactive." };
          }
          return {
            ok: false as const,
            status: 409,
            error: slotCheck.collidingEvent
              ? `Venue conflict: "${slotCheck.collidingEvent.title}" overlaps this slot.`
              : "This venue is already booked for the selected slot.",
          };
        }

        const [inserted] = await tx
          .insert(events)
          .values({
            originType: data.originType,
            communityId: primaryCommunityId,
            departmentId: primaryDepartmentId,
            venueId: data.venueId,
            createdBy: session.userId,
            title: data.title.trim(),
            slug: slugifyTitle(data.title),
            description: data.description.trim(),
            category: data.category,
            targetAudience: data.targetAudience,
            startTime: startDate,
            endTime: endDate,
            locationName: slotCheck.venueName,
            status: isSubmitting ? "pending_stage2" : "draft",
            coverImageUrl: data.coverImageUrl || null,
            externalRegistrationUrl: data.externalRegistrationUrl || null,
            estimatedBudget: String(data.estimatedBudget ?? 0),
            fundingSource: data.fundingSource || "No Cost",
          })
          .returning();

        if (data.mentors.length > 0) {
          await tx.insert(eventMentors).values(
            data.mentors.map((m) => ({
              eventId: inserted.id,
              name: m.name.trim(),
              roleTitle: m.roleTitle.trim(),
              organization: m.organization.trim(),
              mentorType: m.mentorType,
              phase: "planned",
            }))
          );
        }

        const stage2Entities = buildStage2Entities(primaryHost, data.coHosts);
        if (isSubmitting) {
          await submitOrResubmitProposalToStage2Tx(tx, {
            eventId: inserted.id,
            eventTitle: inserted.title,
            actorSession: session,
            stage2Entities,
          });
        } else if (stage2Entities.length > 0) {
          await tx.insert(eventStage2Approvals).values(
            stage2Entities.map((entity) => ({
              eventId: inserted.id,
              entityType: entity.entityType,
              departmentId: entity.departmentId,
              communityId: entity.communityId,
              isPrimary: entity.isPrimary,
              approvalStatus: "pending",
              reportVerifyStatus: "pending",
            }))
          );
        }

        const [fresh] = await tx
          .select()
          .from(events)
          .where(eq(events.id, inserted.id))
          .limit(1);

        return { ok: true as const, event: fresh || inserted };
      })
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    safeRevalidatePath("/lead");
    safeRevalidatePath("/hod");
    safeRevalidatePath("/fic");

    return NextResponse.json(
      { success: true, event: formatCampusEvent(result.event) },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("[POST /api/workspace/events] Error:", err);
    return NextResponse.json(
      { error: "Failed to save event proposal" },
      { status: 500 }
    );
  }
}
