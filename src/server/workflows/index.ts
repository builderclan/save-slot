import { eq, inArray, sql } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { differenceInCalendarDays } from "date-fns";
import * as schema from "@/db/schema";
import {
  collegeSettings,
  communities,
  departments,
  eventApprovals,
  eventReferenceCounters,
  eventStage2Approvals,
  events,
} from "@/db/schema";
import { withDbRetry } from "@/lib/db";
import { formatEventReferenceNumber, getAcademicYear } from "@/lib/academic-year";
import { AuthSession } from "@/server/auth";
import { assertVenueSlotAvailableForTx } from "@/server/conflicts";
import {
  dispatchNotifications,
  getExecutiveUserIds,
  getStage2NotificationUserIds,
} from "@/server/notifications";

export type DbClientOrTx = NodePgDatabase<typeof schema>;

export interface Stage2HostInput {
  entityType: "department" | "community";
  departmentId: string | null;
  communityId: string | null;
  isPrimary: boolean;
}

export type WorkflowActionResult<T = Record<string, unknown>> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; code?: string };

/**
 * Builds a deduplicated ordered list of Stage 2 hosts (primary host first, followed by unique co-hosts).
 */
export function buildStage2Entities(
  primary: { entityType: "department" | "community"; id: string },
  coHosts: Array<{ entityType: "department" | "community"; id: string }> = []
): Stage2HostInput[] {
  const seen = new Set<string>();
  const result: Stage2HostInput[] = [];

  const pushUnique = (
    entityType: "department" | "community",
    id: string,
    isPrimary: boolean
  ) => {
    const key = `${entityType}:${id}`;
    if (!id || seen.has(key)) return;
    seen.add(key);
    result.push({
      entityType,
      departmentId: entityType === "department" ? id : null,
      communityId: entityType === "community" ? id : null,
      isPrimary,
    });
  };

  pushUnique(primary.entityType, primary.id, true);
  for (const coHost of coHosts) {
    pushUnique(coHost.entityType, coHost.id, false);
  }

  return result;
}

/**
 * Inserts an immutable audit record in `event_approvals`.
 */
export async function recordApprovalAudit(
  tx: DbClientOrTx,
  params: {
    eventId: string;
    stage: string;
    action: string;
    actorSession: AuthSession;
    remarks?: string | null;
  }
): Promise<void> {
  await tx.insert(eventApprovals).values({
    eventId: params.eventId,
    stage: params.stage,
    action: params.action,
    actorId: params.actorSession.userId,
    actorNameSnapshot: params.actorSession.profile.full_name || params.actorSession.email,
    actorRoleSnapshot: params.actorSession.profile.role,
    remarks: params.remarks?.trim() || null,
  });
}

/**
 * Atomically generates a gap-free AISAT reference number (`SHORT/YYYY-YY/HOST/NNN`)
 * inside the enclosing approval transaction using `ON CONFLICT ... DO UPDATE`.
 */
export async function generateEventReferenceNumber(
  tx: DbClientOrTx,
  params: {
    hostCode: string;
    eventStartTime: Date;
  }
): Promise<{ referenceNumber: string; academicYear: string }> {
  const [settings] = await tx.select().from(collegeSettings).limit(1);
  const collegePrefix = (settings?.shortCode || "AISAT").trim().toUpperCase();
  const academicYear = getAcademicYear(
    params.eventStartTime,
    settings?.academicYearStartMonth || 7
  );
  const cleanHostCode =
    params.hostCode
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "")
      .slice(0, 20) || collegePrefix;

  const [counter] = await tx
    .insert(eventReferenceCounters)
    .values({
      academicYear,
      hostCode: cleanHostCode,
      lastSeq: 1,
    })
    .onConflictDoUpdate({
      target: [eventReferenceCounters.academicYear, eventReferenceCounters.hostCode],
      set: {
        lastSeq: sql`${eventReferenceCounters.lastSeq} + 1`,
      },
    })
    .returning({ lastSeq: eventReferenceCounters.lastSeq });

  return {
    referenceNumber: formatEventReferenceNumber({
      collegeShortCode: collegePrefix,
      academicYear,
      hostCode: cleanHostCode,
      sequence: counter?.lastSeq || 1,
    }),
    academicYear,
  };
}

/**
 * Resets/initializes `event_stage2_approvals`, sets status to `pending_stage2`,
 * logs `submission` audit entry, and notifies required Stage 2 HOD/FIC approvers.
 */
export async function submitOrResubmitProposalToStage2Tx(
  tx: DbClientOrTx,
  params: {
    eventId: string;
    eventTitle: string;
    actorSession: AuthSession;
    stage2Entities: Stage2HostInput[];
  }
): Promise<void> {
  await tx.delete(eventStage2Approvals).where(eq(eventStage2Approvals.eventId, params.eventId));

  if (params.stage2Entities.length > 0) {
    await tx.insert(eventStage2Approvals).values(
      params.stage2Entities.map((entity) => ({
        eventId: params.eventId,
        entityType: entity.entityType,
        departmentId: entity.departmentId,
        communityId: entity.communityId,
        isPrimary: entity.isPrimary,
        approvalStatus: "pending",
        reportVerifyStatus: "pending",
      }))
    );
  }

  await tx
    .update(events)
    .set({
      status: "pending_stage2",
      rejectionReason: null,
      updatedAt: new Date(),
    })
    .where(eq(events.id, params.eventId));

  await recordApprovalAudit(tx, {
    eventId: params.eventId,
    stage: "submission",
    action: "submitted",
    actorSession: params.actorSession,
  });

  const stage2Recipients = await getStage2NotificationUserIds(tx, params.stage2Entities);
  await dispatchNotifications(
    tx,
    stage2Recipients.map((userId) => ({
      userId,
      eventId: params.eventId,
      type: "stage2_pending",
      title: "Event Proposal Awaiting Stage 2 Approval",
      message: `"${params.eventTitle}" was submitted for your Stage 2 review.`,
    }))
  );
}

/**
 * Executes a Stage 2 HOD/Acting-HOD or FIC decision (`approve` / `reject`) inside an
 * atomic `FOR UPDATE` transaction, supporting parallel co-host sign-offs.
 */
export async function decideStage2Event(params: {
  eventId: string;
  actorSession: AuthSession;
  scope: "hod" | "fic";
  decision: "approve" | "reject";
  remarks?: string | null;
}): Promise<WorkflowActionResult<{ status: string; allStage2Approved: boolean }>> {
  if (params.decision === "reject" && (!params.remarks || params.remarks.trim().length < 5)) {
    return {
      ok: false,
      status: 400,
      error: "A rejection reason (minimum 5 characters) is mandatory.",
    };
  }

  const ownedIds =
    params.scope === "hod"
      ? params.actorSession.hodDepartments.map((d) => d.id)
      : params.actorSession.ficCommunities.map((c) => c.id);

  if (ownedIds.length === 0) {
    return {
      ok: false,
      status: 403,
      error:
        params.scope === "hod"
          ? "Forbidden: You are not currently assigned as HOD or active Acting HOD for any department."
          : "Forbidden: You are not assigned as Faculty-in-Charge (FIC) for any community.",
    };
  }

  return withDbRetry((client) =>
    client.transaction(async (tx) => {
      const [eventRow] = await tx
        .select()
        .from(events)
        .where(eq(events.id, params.eventId))
        .for("update")
        .limit(1);

      if (!eventRow) {
        return { ok: false, status: 404, error: "Event not found." };
      }

      if (eventRow.status !== "pending_stage2") {
        return {
          ok: false,
          status: 409,
          error: `Event is currently '${eventRow.status}' and not awaiting Stage 2 approval.`,
        };
      }

      const stage2Rows = await tx
        .select()
        .from(eventStage2Approvals)
        .where(eq(eventStage2Approvals.eventId, params.eventId))
        .for("update");

      const matchingRows = stage2Rows.filter((row) =>
        params.scope === "hod"
          ? row.entityType === "department" && row.departmentId && ownedIds.includes(row.departmentId)
          : row.entityType === "community" && row.communityId && ownedIds.includes(row.communityId)
      );

      if (matchingRows.length === 0) {
        return {
          ok: false,
          status: 403,
          error: "Forbidden: This event does not require your Stage 2 review.",
        };
      }

      const pendingMatches = matchingRows.filter((row) => row.approvalStatus === "pending");
      if (pendingMatches.length === 0) {
        return {
          ok: false,
          status: 409,
          error: "Your Stage 2 sign-off for this event has already been recorded.",
        };
      }

      const now = new Date();
      const stageLabel = params.scope === "hod" ? "stage2_hod" : "stage2_fic";

      if (params.decision === "reject") {
        const reason = params.remarks!.trim();
        await tx
          .update(eventStage2Approvals)
          .set({
            approvalStatus: "rejected",
            approvedBy: params.actorSession.userId,
            approvedAt: now,
            approvalRemarks: reason,
          })
          .where(inArray(eventStage2Approvals.id, pendingMatches.map((r) => r.id)));

        await tx
          .update(events)
          .set({
            status: "rejected",
            rejectionReason: reason,
            reviewedBy: params.actorSession.userId,
            updatedAt: now,
          })
          .where(eq(events.id, params.eventId));

        await recordApprovalAudit(tx, {
          eventId: params.eventId,
          stage: stageLabel,
          action: "rejected",
          actorSession: params.actorSession,
          remarks: reason,
        });

        if (eventRow.createdBy) {
          await dispatchNotifications(tx, [
            {
              userId: eventRow.createdBy,
              eventId: params.eventId,
              type: "event_rejected",
              title: "Proposal Returned for Revision",
              message: `"${eventRow.title}" was returned at Stage 2: ${reason}`,
            },
          ]);
        }

        return { ok: true, data: { status: "rejected", allStage2Approved: false } };
      }

      // Approve actor's pending Stage 2 rows
      await tx
        .update(eventStage2Approvals)
        .set({
          approvalStatus: "approved",
          approvedBy: params.actorSession.userId,
          approvedAt: now,
          approvalRemarks: params.remarks?.trim() || null,
        })
        .where(inArray(eventStage2Approvals.id, pendingMatches.map((r) => r.id)));

      await recordApprovalAudit(tx, {
        eventId: params.eventId,
        stage: stageLabel,
        action: "approved",
        actorSession: params.actorSession,
        remarks: params.remarks,
      });

      const approvedMatchIds = new Set(pendingMatches.map((r) => r.id));
      const allStage2Approved = stage2Rows.every(
        (r) => approvedMatchIds.has(r.id) || r.approvalStatus === "approved"
      );

      if (allStage2Approved) {
        await tx
          .update(events)
          .set({
            status: "pending_executive",
            updatedAt: now,
          })
          .where(eq(events.id, params.eventId));

        const execUsers = await getExecutiveUserIds(tx);
        const notificationsPayload = execUsers.map((userId) => ({
          userId,
          eventId: params.eventId,
          type: "executive_pending",
          title: "Event Ready for Executive Sign-Off",
          message: `"${eventRow.title}" cleared Stage 2 review and awaits Principal/VP approval.`,
        }));

        if (eventRow.createdBy) {
          notificationsPayload.push({
            userId: eventRow.createdBy,
            eventId: params.eventId,
            type: "stage2_approved",
            title: "Stage 2 Approval Complete",
            message: `"${eventRow.title}" cleared all Stage 2 reviews and advanced to Principal/VP.`,
          });
        }

        await dispatchNotifications(tx, notificationsPayload);
        return { ok: true, data: { status: "pending_executive", allStage2Approved: true } };
      }

      if (eventRow.createdBy) {
        await dispatchNotifications(tx, [
          {
            userId: eventRow.createdBy,
            eventId: params.eventId,
            type: "stage2_partial_approved",
            title: "Co-Host Sign-Off Recorded",
            message: `"${eventRow.title}" received Stage 2 approval; awaiting remaining co-host sign-offs.`,
          },
        ]);
      }

      return { ok: true, data: { status: "pending_stage2", allStage2Approved: false } };
    })
  );
}

/**
 * Resolves the host code prefix used in `AISAT/<YYYY-YY>/<HOST_CODE>/<NNN>`.
 */
async function resolveHostCodeForEventTx(
  tx: DbClientOrTx,
  eventRow: typeof events.$inferSelect
): Promise<string> {
  if (eventRow.originType === "community" && eventRow.communityId) {
    const [comm] = await tx
      .select({ code: communities.code })
      .from(communities)
      .where(eq(communities.id, eventRow.communityId))
      .limit(1);
    if (comm?.code) return comm.code;
  }

  if (eventRow.originType === "department" && eventRow.departmentId) {
    const [dept] = await tx
      .select({ code: departments.code })
      .from(departments)
      .where(eq(departments.id, eventRow.departmentId))
      .limit(1);
    if (dept?.code) return dept.code;
  }

  return "COLLEGE";
}

/**
 * Executes Stage 3 Executive approval/rejection (`principal` / `vice_principal`),
 * enforcing 7-day lead-time confirmation, `FOR UPDATE` venue collision check,
 * atomic reference number generation, audit logging, and notifications.
 */
export async function decideExecutiveEvent(params: {
  eventId: string;
  actorSession: AuthSession;
  decision: "approve" | "reject";
  remarks?: string | null;
  overrideLeadTime?: boolean;
  overrideReason?: string | null;
}): Promise<
  WorkflowActionResult<{
    status: string;
    referenceNumber?: string | null;
    academicYear?: string | null;
  }>
> {
  if (!params.actorSession.isPrincipal && !params.actorSession.isVicePrincipal) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden: Principal or Vice Principal privileges required.",
    };
  }

  if (params.decision === "reject" && (!params.remarks || params.remarks.trim().length < 5)) {
    return {
      ok: false,
      status: 400,
      error: "A rejection reason (minimum 5 characters) is mandatory.",
    };
  }

  return withDbRetry((client) =>
    client.transaction(async (tx) => {
      const [eventRow] = await tx
        .select()
        .from(events)
        .where(eq(events.id, params.eventId))
        .for("update")
        .limit(1);

      if (!eventRow) {
        return { ok: false, status: 404, error: "Event not found." };
      }

      if (eventRow.status !== "pending_executive") {
        return {
          ok: false,
          status: 409,
          error: `Event is currently '${eventRow.status}' and not awaiting executive approval.`,
        };
      }

      const now = new Date();

      if (params.decision === "reject") {
        const reason = params.remarks!.trim();
        await tx
          .update(events)
          .set({
            status: "rejected",
            rejectionReason: reason,
            reviewedBy: params.actorSession.userId,
            updatedAt: now,
          })
          .where(eq(events.id, params.eventId));

        await recordApprovalAudit(tx, {
          eventId: params.eventId,
          stage: "executive",
          action: "rejected",
          actorSession: params.actorSession,
          remarks: reason,
        });

        if (eventRow.createdBy) {
          await dispatchNotifications(tx, [
            {
              userId: eventRow.createdBy,
              eventId: params.eventId,
              type: "event_rejected",
              title: "Proposal Returned by Executive Office",
              message: `"${eventRow.title}" was rejected: ${reason}`,
            },
          ]);
        }

        return { ok: true, data: { status: "rejected" } };
      }

      // Check 7-day lead-time rule
      const diffDays = differenceInCalendarDays(eventRow.startTime, now);
      const hasLeadViolation = diffDays < 7;
      if (hasLeadViolation && !params.overrideLeadTime) {
        return {
          ok: false,
          status: 409,
          code: "LEAD_TIME_OVERRIDE_REQUIRED",
          error: `Event starts in ${diffDays} day(s), under the 7-day notice policy. Explicit Principal/VP override confirmation is required.`,
        };
      }

      // Serialize venue lock check if venue assigned
      if (eventRow.venueId) {
        const slotCheck = await assertVenueSlotAvailableForTx(tx, {
          venueId: eventRow.venueId,
          startTime: eventRow.startTime,
          endTime: eventRow.endTime,
          excludeEventId: eventRow.id,
        });
        if (!slotCheck.ok) {
          return {
            ok: false,
            status: 409,
            code: "VENUE_CONFLICT",
            error:
              slotCheck.reason === "slot_conflict" && slotCheck.collidingEvent
                ? `Venue conflict: "${slotCheck.collidingEvent.title}" overlaps this slot.`
                : "Target venue is inactive or unavailable.",
          };
        }
      }

      const hostCode = await resolveHostCodeForEventTx(tx, eventRow);
      const { referenceNumber, academicYear } = eventRow.referenceNumber
        ? {
            referenceNumber: eventRow.referenceNumber,
            academicYear: eventRow.academicYear || getAcademicYear(eventRow.startTime),
          }
        : await generateEventReferenceNumber(tx, {
            hostCode,
            eventStartTime: eventRow.startTime,
          });

      const resolvedOverrideReason = hasLeadViolation
        ? params.overrideReason?.trim() || "Executive 7-day notice policy override"
        : eventRow.overrideReason;

      await tx
        .update(events)
        .set({
          status: "published",
          referenceNumber,
          academicYear,
          isLeadTimeOverridden: Boolean(hasLeadViolation || eventRow.isLeadTimeOverridden),
          overrideReason: resolvedOverrideReason,
          reviewedBy: params.actorSession.userId,
          rejectionReason: null,
          updatedAt: now,
        })
        .where(eq(events.id, params.eventId));

      await recordApprovalAudit(tx, {
        eventId: params.eventId,
        stage: "executive",
        action: "approved",
        actorSession: params.actorSession,
        remarks: params.remarks,
      });

      if (hasLeadViolation) {
        await recordApprovalAudit(tx, {
          eventId: params.eventId,
          stage: "override",
          action: "overridden",
          actorSession: params.actorSession,
          remarks: resolvedOverrideReason,
        });
      }

      if (eventRow.createdBy) {
        await dispatchNotifications(tx, [
          {
            userId: eventRow.createdBy,
            eventId: params.eventId,
            type: "event_published",
            title: "Event Approved & Published",
            message: `"${eventRow.title}" is published (${referenceNumber}).`,
          },
        ]);
      }

      return {
        ok: true,
        data: {
          status: "published",
          referenceNumber,
          academicYear,
        },
      };
    })
  );
}

/**
 * Forces colliding Community/Department events into `needs_reschedule` when
 * a Principal/VP College event overrides a booked slot, recording audit entries
 * and alerting affected proposers and Stage 2 entities.
 */
export async function bumpCollidingEventsForCollegeTx(
  tx: DbClientOrTx,
  params: {
    collegeEventId: string;
    collegeEventTitle: string;
    targetEventIds: string[];
    actorSession: AuthSession;
    reason?: string | null;
  }
): Promise<string[]> {
  if (params.targetEventIds.length === 0) return [];

  const collidingRows = await tx
    .select()
    .from(events)
    .where(inArray(events.id, params.targetEventIds))
    .for("update");

  const bumpedIds: string[] = [];
  const bumpMessage =
    params.reason?.trim() ||
    `Reschedule requested due to institutional College event "${params.collegeEventTitle}".`;

  for (const row of collidingRows) {
    if (row.originType === "college" || row.status === "cancelled" || row.status === "completed") {
      continue;
    }

    await tx
      .update(events)
      .set({
        status: "needs_reschedule",
        rejectionReason: bumpMessage,
        updatedAt: new Date(),
      })
      .where(eq(events.id, row.id));

    await recordApprovalAudit(tx, {
      eventId: row.id,
      stage: "override",
      action: "bumped",
      actorSession: params.actorSession,
      remarks: bumpMessage,
    });

    const recipients: Array<{
      userId: string;
      eventId: string;
      type: string;
      title: string;
      message: string;
    }> = [];

    if (row.createdBy) {
      recipients.push({
        userId: row.createdBy,
        eventId: row.id,
        type: "event_bumped",
        title: "Reschedule Required (College Event Priority)",
        message: `"${row.title}" was bumped by "${params.collegeEventTitle}". ${bumpMessage}`,
      });
    }

    const stage2Rows = await tx
      .select({
        entityType: eventStage2Approvals.entityType,
        departmentId: eventStage2Approvals.departmentId,
        communityId: eventStage2Approvals.communityId,
      })
      .from(eventStage2Approvals)
      .where(eq(eventStage2Approvals.eventId, row.id));

    const stage2UserIds = await getStage2NotificationUserIds(
      tx,
      stage2Rows.map((s) => ({
        entityType: s.entityType === "community" ? "community" : "department",
        departmentId: s.departmentId,
        communityId: s.communityId,
      }))
    );

    for (const userId of stage2UserIds) {
      recipients.push({
        userId,
        eventId: row.id,
        type: "event_bumped",
        title: "Host Event Bumped for College Priority",
        message: `"${row.title}" needs rescheduling due to "${params.collegeEventTitle}".`,
      });
    }

    await dispatchNotifications(tx, recipients);
    bumpedIds.push(row.id);
  }

  return bumpedIds;
}
