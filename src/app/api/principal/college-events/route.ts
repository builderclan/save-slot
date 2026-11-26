import { NextResponse } from "next/server";
import { differenceInCalendarDays } from "date-fns";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/server/auth";
import { withDbRetry } from "@/lib/db";
import { collegeSettings, eventMentors, events, venues } from "@/db/schema";
import { formatCampusEvent } from "@/db/adapters";
import { CollegeEventCreateSchema } from "@/lib/validations";
import { safeRevalidatePath } from "@/lib/revalidate";
import { findCollidingEventsForSlot } from "@/server/conflicts";
import {
  bumpCollidingEventsForCollegeTx,
  generateEventReferenceNumber,
  recordApprovalAudit,
} from "@/server/workflows";
import { dispatchNotifications } from "@/server/notifications";
import { slugifyTitle } from "@/server/workspace";

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || (!session.isPrincipal && !session.isVicePrincipal)) {
      return NextResponse.json({ error: "Unauthorized executive access" }, { status: 403 });
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = CollegeEventCreateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid College event data" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);
    const now = new Date();
    const diffDays = differenceInCalendarDays(startTime, now);
    const hasLeadViolation = diffDays < 7;

    if (hasLeadViolation && !data.overrideLeadTime) {
      return NextResponse.json(
        {
          error: `This event starts in ${diffDays} day(s) (< 7 days notice). Confirm executive override to proceed.`,
          code: "LEAD_TIME_OVERRIDE_REQUIRED",
        },
        { status: 409 }
      );
    }

    const forceSet = new Set(data.forceRescheduleEventIds);

    const result = await withDbRetry((client) =>
      client.transaction(async (tx) => {
        const [venueRow] = await tx
          .select()
          .from(venues)
          .where(eq(venues.id, data.venueId))
          .for("update")
          .limit(1);

        if (!venueRow || !venueRow.isActive) {
          return {
            ok: false as const,
            status: venueRow ? 400 : 404,
            error: venueRow ? "Selected venue is inactive." : "Selected venue not found.",
          };
        }

        const collisions = await findCollidingEventsForSlot(tx, {
          venueId: data.venueId,
          startTime,
          endTime,
          lockForUpdate: true,
        });

        const collidingCollegeEvent = collisions.find((c) => c.originType === "college");
        if (collidingCollegeEvent) {
          return {
            ok: false as const,
            status: 409,
            code: "COLLEGE_EVENT_COLLISION",
            error: `Another institutional College event ("${collidingCollegeEvent.title}") is already scheduled in this slot.`,
          };
        }

        const unconfirmedCollisions = collisions.filter((c) => !forceSet.has(c.id));
        if (unconfirmedCollisions.length > 0) {
          return {
            ok: false as const,
            status: 409,
            code: "COLLEGE_COLLISION_CONFIRM_REQUIRED",
            error: `${unconfirmedCollisions.length} scheduled booking(s) overlap this slot. Confirm override to bump them to Needs Reschedule.`,
            collisions: collisions.map((c) => ({
              id: c.id,
              title: c.title,
              status: c.status,
              origin_type: c.originType,
              start_time: c.startTime.toISOString(),
              end_time: c.endTime.toISOString(),
            })),
          };
        }

        const [settings] = await tx.select().from(collegeSettings).limit(1);
        const collegeCode = (settings?.shortCode || "AISAT").trim().toUpperCase();

        const { referenceNumber, academicYear } = await generateEventReferenceNumber(tx, {
          hostCode: collegeCode,
          eventStartTime: startTime,
        });

        const coordinatorId = data.coordinatorId?.trim() || null;
        const resolvedOverrideReason = hasLeadViolation
          ? data.overrideReason?.trim() || "Executive 7-day notice override for institutional College event"
          : null;

        const [created] = await tx
          .insert(events)
          .values({
            originType: "college",
            communityId: null,
            departmentId: null,
            venueId: data.venueId,
            coordinatorId,
            referenceNumber,
            academicYear,
            title: data.title.trim(),
            slug: slugifyTitle(data.title),
            description: data.description.trim(),
            category: data.category,
            targetAudience: data.targetAudience,
            startTime,
            endTime,
            locationName: venueRow.name,
            coverImageUrl: data.coverImageUrl || null,
            externalRegistrationUrl: data.externalRegistrationUrl || null,
            estimatedBudget: String(data.estimatedBudget ?? 0),
            fundingSource: data.fundingSource || "College Fund",
            isLeadTimeOverridden: hasLeadViolation,
            overrideReason: resolvedOverrideReason,
            status: "published",
            createdBy: session.userId,
            reviewedBy: session.userId,
          })
          .returning();

        if (data.mentors.length > 0) {
          await tx.insert(eventMentors).values(
            data.mentors.map((m) => ({
              eventId: created.id,
              name: m.name.trim(),
              roleTitle: m.roleTitle.trim(),
              organization: m.organization.trim(),
              mentorType: m.mentorType,
              phase: "planned",
            }))
          );
        }

        await recordApprovalAudit(tx, {
          eventId: created.id,
          stage: "executive",
          action: "approved",
          actorSession: session,
          remarks: "Direct institutional College event creation",
        });

        if (hasLeadViolation) {
          await recordApprovalAudit(tx, {
            eventId: created.id,
            stage: "override",
            action: "overridden",
            actorSession: session,
            remarks: resolvedOverrideReason,
          });
        }

        const bumpedIds = await bumpCollidingEventsForCollegeTx(tx, {
          collegeEventId: created.id,
          collegeEventTitle: created.title,
          targetEventIds: collisions.map((c) => c.id),
          actorSession: session,
          reason: data.rescheduleReason,
        });

        if (coordinatorId) {
          await dispatchNotifications(tx, [
            {
              userId: coordinatorId,
              eventId: created.id,
              type: "college_coordinator_assigned",
              title: "Assigned Coordinator for College Event",
              message: `You have been assigned post-event closure responsibility for "${created.title}" (${referenceNumber}).`,
            },
          ]);
        }

        return { ok: true as const, event: created, bumpedIds };
      })
    );

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          ...(result.code ? { code: result.code } : {}),
          ...("collisions" in result && result.collisions
            ? { collisions: result.collisions }
            : {}),
        },
        { status: result.status }
      );
    }

    safeRevalidatePath("/");
    safeRevalidatePath("/principal");
    safeRevalidatePath("/lead");
    safeRevalidatePath("/hod");
    safeRevalidatePath("/fic");

    return NextResponse.json(
      {
        success: true,
        event: formatCampusEvent(result.event),
        bumpedEventIds: result.bumpedIds,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("[POST /api/principal/college-events] Error:", err);
    return NextResponse.json({ error: "Failed to publish College event" }, { status: 500 });
  }
}
