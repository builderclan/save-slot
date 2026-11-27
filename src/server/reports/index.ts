import { NextResponse } from "next/server";
import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import {
  collegeSettings,
  communityMembers,
  eventApprovals,
  eventMentors,
  eventReports,
  eventStage2Approvals,
  events,
} from "@/db/schema";
import {
  formatCampusEvent,
  formatCollegeSettings,
} from "@/db/adapters";
import { withDbRetry } from "@/lib/db";
import { safeRevalidatePath } from "@/lib/revalidate";
import { ReportVerifySchema, type ClosureReportInput } from "@/lib/validations";
import { getCurrentUser, type AuthSession } from "@/server/auth";
import {
  dispatchNotifications,
  getExecutiveUserIds,
  getStage2NotificationUserIds,
} from "@/server/notifications";
import {
  recordApprovalAudit,
  type WorkflowActionResult,
} from "@/server/workflows";
import { canAccessWorkspaceEvent } from "@/server/workspace";
import type { CampusEvent, CollegeSettings } from "@/types/database";

export interface DossierPayload {
  collegeSettings: CollegeSettings;
  event: CampusEvent;
  coordinator?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  } | null;
}

export interface SummaryRegisterFilters {
  academicYear?: string;
  startDate?: string;
  endDate?: string;
  originType?: "community" | "department" | "college";
  communityScope?: "internal" | "external";
  departmentId?: string;
  status?: string;
  search?: string;
}

export interface SummaryRegisterRow {
  id: string;
  reference_number: string | null;
  academic_year: string | null;
  title: string;
  origin_type: string;
  host_name: string;
  host_code: string | null;
  community_scope: string | null;
  category: string;
  venue_name: string | null;
  start_time: string;
  end_time: string;
  status: string;
  estimated_budget: number;
  actual_fund_used: number;
  funding_source: string;
  student_count: number;
  faculty_count: number;
  external_count: number;
  total_participants: number;
}

export interface SummaryRegisterPayload {
  collegeSettings: CollegeSettings;
  rows: SummaryRegisterRow[];
  totals: {
    totalEvents: number;
    totalParticipants: number;
    totalEstimatedBudget: number;
    totalActualFundUsed: number;
  };
  availableAcademicYears: string[];
}

export interface PublicVerifyPayload {
  reference_number: string;
  academic_year: string | null;
  title: string;
  origin_type: string;
  host_name: string;
  host_code: string | null;
  community_scope: string | null;
  category: string;
  start_time: string;
  end_time: string;
  location_name: string;
  venue_name: string | null;
  venue_building: string | null;
  status: string;
  is_lead_time_overridden: boolean;
  college_name: string;
  college_short_code: string;
  letterhead_subtitle: string | null;
  co_hosts: Array<{
    entity_type: "department" | "community";
    name: string;
    code: string | null;
  }>;
  approval_chain: Array<{
    id: string;
    stage: string;
    action: string;
    actor_name_snapshot: string;
    actor_role_snapshot: string;
    created_at: string;
  }>;
}

function defaultCollegeSettings(): CollegeSettings {
  return {
    id: 1,
    college_name: "Albertian Institute of Science & Technology (AISAT)",
    short_code: "AISAT",
    letterhead_subtitle: "Affiliated to APJ Abdul Kalam Technological University",
    logo_url: null,
    academic_year_start_month: 7,
    timezone: "Asia/Kolkata",
  };
}

/**
 * Submits or updates a post-event NAAC/NBA closure report and confirmed mentors.
 * College events closed directly by Principal/VP transition straight to `completed`;
 * all others move to `pending_report_verification`.
 */
export async function submitClosureReport(params: {
  eventId: string;
  actorSession: AuthSession;
  input: ClosureReportInput;
}): Promise<WorkflowActionResult<{ status: string }>> {
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

      if (!canAccessWorkspaceEvent(params.actorSession, eventRow)) {
        return {
          ok: false,
          status: 403,
          error: "Forbidden: You do not have permission to file a closure report for this event.",
        };
      }

      if (
        eventRow.status !== "published" &&
        eventRow.status !== "pending_report_verification"
      ) {
        return {
          ok: false,
          status: 409,
          error: `Closure reports can only be filed for published or pending-verification events (current status: '${eventRow.status}').`,
        };
      }

      const now = new Date();
      const [existingReport] = await tx
        .select({ id: eventReports.id })
        .from(eventReports)
        .where(eq(eventReports.eventId, params.eventId))
        .limit(1);

      if (existingReport) {
        await tx
          .update(eventReports)
          .set({
            actualFundUsed: String(params.input.actualFundUsed ?? 0),
            fundingSource: params.input.fundingSource,
            fundNotes: params.input.fundNotes?.trim() || null,
            studentCount: params.input.studentCount ?? 0,
            facultyCount: params.input.facultyCount ?? 0,
            externalCount: params.input.externalCount ?? 0,
            summary: params.input.summary.trim(),
            outcomes: params.input.outcomes.trim(),
            evidenceUrl: params.input.evidenceUrl?.trim() || null,
            submittedBy: params.actorSession.userId,
            updatedAt: now,
          })
          .where(eq(eventReports.id, existingReport.id));
      } else {
        await tx.insert(eventReports).values({
          eventId: params.eventId,
          actualFundUsed: String(params.input.actualFundUsed ?? 0),
          fundingSource: params.input.fundingSource,
          fundNotes: params.input.fundNotes?.trim() || null,
          studentCount: params.input.studentCount ?? 0,
          facultyCount: params.input.facultyCount ?? 0,
          externalCount: params.input.externalCount ?? 0,
          summary: params.input.summary.trim(),
          outcomes: params.input.outcomes.trim(),
          evidenceUrl: params.input.evidenceUrl?.trim() || null,
          submittedBy: params.actorSession.userId,
          submittedAt: now,
          updatedAt: now,
        });
      }

      await tx
        .delete(eventMentors)
        .where(
          and(
            eq(eventMentors.eventId, params.eventId),
            eq(eventMentors.phase, "confirmed")
          )
        );

      if (params.input.confirmedMentors.length > 0) {
        await tx.insert(eventMentors).values(
          params.input.confirmedMentors.map((m) => ({
            eventId: params.eventId,
            name: m.name.trim(),
            roleTitle: m.roleTitle.trim(),
            organization: m.organization.trim(),
            mentorType: m.mentorType,
            phase: "confirmed",
          }))
        );
      }

      const isExecutiveClosingCollegeEvent =
        eventRow.originType === "college" &&
        (params.actorSession.isPrincipal || params.actorSession.isVicePrincipal);

      const nextStatus = isExecutiveClosingCollegeEvent
        ? "completed"
        : "pending_report_verification";

      await tx
        .update(events)
        .set({
          status: nextStatus,
          updatedAt: now,
        })
        .where(eq(events.id, params.eventId));

      await recordApprovalAudit(tx, {
        eventId: params.eventId,
        stage: "report_submit",
        action: "submitted",
        actorSession: params.actorSession,
      });

      if (isExecutiveClosingCollegeEvent) {
        await recordApprovalAudit(tx, {
          eventId: params.eventId,
          stage: "report_verify",
          action: "verified",
          actorSession: params.actorSession,
          remarks: "College event closed directly by Executive office.",
        });
        return { ok: true, data: { status: "completed" } };
      }

      if (eventRow.originType === "college") {
        const execUsers = await getExecutiveUserIds(tx);
        await dispatchNotifications(
          tx,
          execUsers.map((userId) => ({
            userId,
            eventId: params.eventId,
            type: "report_verify_pending",
            title: "College Event Report Ready for Verification",
            message: `Closure report for "${eventRow.title}" was submitted and awaits Principal/VP verification.`,
          }))
        );
        return { ok: true, data: { status: "pending_report_verification" } };
      }

      // Reset Stage 2 report verification flags on submission/resubmission
      await tx
        .update(eventStage2Approvals)
        .set({
          reportVerifyStatus: "pending",
          reportVerifiedBy: null,
          reportVerifiedAt: null,
          reportRemarks: null,
        })
        .where(eq(eventStage2Approvals.eventId, params.eventId));

      const stage2Rows = await tx
        .select({
          entityType: eventStage2Approvals.entityType,
          departmentId: eventStage2Approvals.departmentId,
          communityId: eventStage2Approvals.communityId,
        })
        .from(eventStage2Approvals)
        .where(eq(eventStage2Approvals.eventId, params.eventId));

      const stage2Recipients = await getStage2NotificationUserIds(
        tx,
        stage2Rows.map((row) => ({
          entityType: row.entityType === "community" ? "community" : "department",
          departmentId: row.departmentId,
          communityId: row.communityId,
        }))
      );

      await dispatchNotifications(
        tx,
        stage2Recipients.map((userId) => ({
          userId,
          eventId: params.eventId,
          type: "report_verify_pending",
          title: "Closure Report Awaiting Verification",
          message: `Post-event closure report for "${eventRow.title}" was submitted for verification.`,
        }))
      );

      return { ok: true, data: { status: "pending_report_verification" } };
    })
  );
}

/**
 * Verifies or requests revisions on a submitted closure report.
 * Supports parallel co-host verification (`hod` / `fic`) and executive verification (`principal` / `vice_principal`).
 */
export async function verifyClosureReport(params: {
  eventId: string;
  actorSession: AuthSession;
  scope: "hod" | "fic" | "executive";
  decision: "verify" | "request_revision";
  remarks?: string | null;
}): Promise<WorkflowActionResult<{ status: string; allVerified: boolean }>> {
  if (
    params.decision === "request_revision" &&
  reportVersion?: string | null;
    (!params.remarks || params.remarks.trim().length < 5)
  ) {
    return {
      ok: false,
      status: 400,
      error: "Revision remarks (minimum 5 characters) are mandatory.",
    };
  }

  if (
    params.scope === "executive" &&
    !params.actorSession.isPrincipal &&
    !params.actorSession.isVicePrincipal
  ) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden: Principal or Vice Principal privileges required.",
    };
  }

  const ownedIds =
    params.scope === "hod"
      ? params.actorSession.hodDepartments.map((d) => d.id)
      : params.scope === "fic"
      ? params.actorSession.ficCommunities.map((c) => c.id)
      : [];

  if (params.scope !== "executive" && ownedIds.length === 0) {
    return {
      ok: false,
      status: 403,
      error:
        params.scope === "hod"
          ? "Forbidden: You are not currently assigned as HOD or active Acting HOD."
          : "Forbidden: You are not assigned as Faculty-in-Charge (FIC).",
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

      if (eventRow.status !== "pending_report_verification") {
        return {
          ok: false,
          status: 409,
          error: `Event is currently '${eventRow.status}' and not awaiting report verification.`,
        };
      }

      const now = new Date();
      const recipientIds = Array.from(
        new Set(
      const [reportRow] = await tx
        .select({
          updatedAt: eventReports.updatedAt,
          submittedAt: eventReports.submittedAt,
        })
        .from(eventReports)
        .where(eq(eventReports.eventId, params.eventId))
        .limit(1);

      if (!reportRow) {
        return {
          ok: false,
          status: 409,
          error: "No closure report found for this event.",
        };
      }

      if (params.reportVersion) {
        const currentVersion = (reportRow.updatedAt ?? reportRow.submittedAt).toISOString();
        if (params.reportVersion !== currentVersion) {
          return {
            ok: false,
            status: 409,
            error:
              "This closure report was updated by the organizer after you opened it. Please refresh and review the latest version.",
          };
        }
      }

          [eventRow.createdBy, eventRow.coordinatorId].filter((id): id is string =>
            Boolean(id)
          )
        )
      );

      if (params.scope === "executive") {
        if (params.decision === "request_revision") {
          const reason = params.remarks!.trim();
          await recordApprovalAudit(tx, {
            eventId: params.eventId,
            stage: "report_verify",
            action: "revision_requested",
            actorSession: params.actorSession,
            remarks: reason,
          });

          await dispatchNotifications(
            tx,
            recipientIds.map((userId) => ({
              userId,
              eventId: params.eventId,
              type: "report_revision_requested",
              title: "Closure Report Revision Requested",
              message: `Executive review requested revisions for "${eventRow.title}": ${reason}`,
            }))
          );

          return {
            ok: true,
            data: { status: "pending_report_verification", allVerified: false },
          };
        }

        await tx
          .update(events)
          .set({ status: "completed", updatedAt: now })
          .where(eq(events.id, params.eventId));

        await recordApprovalAudit(tx, {
          eventId: params.eventId,
          stage: "report_verify",
          action: "verified",
          actorSession: params.actorSession,
          remarks: params.remarks,
        });

        await dispatchNotifications(
          tx,
          recipientIds.map((userId) => ({
            userId,
            eventId: params.eventId,
            type: "report_completed",
            title: "Event Closure Report Verified",
            message: `"${eventRow.title}" closure report was verified and locked for filing.`,
          }))
        );

        return { ok: true, data: { status: "completed", allVerified: true } };
      }

      const stage2Rows = await tx
        .select()
        .from(eventStage2Approvals)
        .where(eq(eventStage2Approvals.eventId, params.eventId))
        .for("update");

      const ownedSet = new Set(ownedIds);
      const matchingRows = stage2Rows.filter((row) =>
        params.scope === "hod"
          ? row.entityType === "department" &&
            row.departmentId &&
            ownedSet.has(row.departmentId)
          : row.entityType === "community" &&
            row.communityId &&
            ownedSet.has(row.communityId)
      );

      if (matchingRows.length === 0) {
        return {
          ok: false,
          status: 403,
          error: "Your department/community is not a host for this event.",
        };
      }

      const pendingMatches = matchingRows.filter(
        (row) => row.reportVerifyStatus !== "verified"
      );
      if (pendingMatches.length === 0) {
        return {
          ok: false,
          status: 409,
          error: "Report verification for your unit has already been completed.",
        };
      }

      if (params.decision === "request_revision") {
        const reason = params.remarks!.trim();
        await tx
          .update(eventStage2Approvals)
          .set({
            reportVerifyStatus: "revision_requested",
            reportVerifiedBy: params.actorSession.userId,
            reportVerifiedAt: now,
            reportRemarks: reason,
          })
          .where(
            inArray(
              eventStage2Approvals.id,
              pendingMatches.map((r) => r.id)
            )
          );

        await recordApprovalAudit(tx, {
          eventId: params.eventId,
          stage: "report_verify",
          action: "revision_requested",
          actorSession: params.actorSession,
          remarks: reason,
        });

        await dispatchNotifications(
          tx,
          recipientIds.map((userId) => ({
            userId,
            eventId: params.eventId,
            type: "report_revision_requested",
            title: "Closure Report Revision Requested",
            message: `"${eventRow.title}" closure report needs updates: ${reason}`,
          }))
        );

        return {
          ok: true,
          data: { status: "pending_report_verification", allVerified: false },
        };
      }

      await tx
        .update(eventStage2Approvals)
        .set({
          reportVerifyStatus: "verified",
          reportVerifiedBy: params.actorSession.userId,
          reportVerifiedAt: now,
          reportRemarks: params.remarks?.trim() || null,
        })
        .where(
          inArray(
            eventStage2Approvals.id,
            pendingMatches.map((r) => r.id)
          )
        );

      await recordApprovalAudit(tx, {
        eventId: params.eventId,
        stage: "report_verify",
        action: "verified",
        actorSession: params.actorSession,
        remarks: params.remarks,
      });

      const verifiedIds = new Set(pendingMatches.map((r) => r.id));
      const allVerified = stage2Rows.every(
        (r) => verifiedIds.has(r.id) || r.reportVerifyStatus === "verified"
      );

      if (allVerified) {
        await tx
          .update(events)
          .set({ status: "completed", updatedAt: now })
          .where(eq(events.id, params.eventId));

        await dispatchNotifications(
          tx,
          recipientIds.map((userId) => ({
            userId,
            eventId: params.eventId,
            type: "report_completed",
            title: "Event Closure Report Verified",
            message: `"${eventRow.title}" closure report was verified by all hosts and locked as completed.`,
          }))
        );

        return { ok: true, data: { status: "completed", allVerified: true } };
      }

      return {
        ok: true,
        data: { status: "pending_report_verification", allVerified: false },
      };
    })
  );
}

/**
 * Shared HTTP handler for HOD, FIC, and Executive report verification endpoints.
 */
export async function handleReportVerifyPatch(
  request: Request,
  eventId: string,
  scope: "hod" | "fic" | "executive"
): Promise<NextResponse> {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = ReportVerifySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid verification payload" },
      { status: 400 }
    );
  }

  const result = await verifyClosureReport({
    eventId,
    actorSession: session,
    scope,
    decision: parsed.data.decision,
    remarks: parsed.data.remarks,
  });

  if (!result.ok) {
    reportVersion: parsed.data.reportVersion,
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  safeRevalidatePath("/fic");
  safeRevalidatePath("/hod");
  safeRevalidatePath("/principal");
  safeRevalidatePath("/lead");
  safeRevalidatePath(`/reports/events/${eventId}`);

  return NextResponse.json({ success: true, ...result.data });
}

/**
 * Checks if `session` can view the full printable dossier for `eventRow`.
 */
function canViewEventDossier(
  session: AuthSession,
  eventRow: {
    createdBy: string | null;
    coordinatorId: string | null;
    communityId: string | null;
    departmentId: string | null;
    stage2Approvals?: Array<{
      departmentId: string | null;
      communityId: string | null;
    }> | null;
  }
): boolean {
  if (
    session.isPrincipal ||
    session.isVicePrincipal ||
    session.isAdmin
  ) {
    return true;
  }
  if (canAccessWorkspaceEvent(session, eventRow)) {
    return true;
  }
  const ficSet = new Set(session.ficCommunities.map((c) => c.id));
  const hodSet = new Set(session.hodDepartments.map((d) => d.id));
  if (eventRow.communityId && ficSet.has(eventRow.communityId)) return true;
  if (eventRow.departmentId && hodSet.has(eventRow.departmentId)) return true;
  return Boolean(
    eventRow.stage2Approvals?.some(
      (s) =>
        (s.communityId && ficSet.has(s.communityId)) ||
        (s.departmentId && hodSet.has(s.departmentId))
    )
  );
}

/**
 * Loads the complete dossier payload for `/reports/events/[id]`.
 */
export async function getDossierPayload(
  eventId: string,
  session: AuthSession
): Promise<WorkflowActionResult<DossierPayload>> {
  return withDbRetry(async (client) => {
    const [settingsRow, eventRow] = await Promise.all([
      client.select().from(collegeSettings).limit(1).then((rows) => rows[0] ?? null),
      client.query.events.findFirst({
        where: eq(events.id, eventId),
        with: {
          community: {
            columns: {
              id: true,
              name: true,
              slug: true,
              code: true,
              scope: true,
              category: true,
            },
            with: {
              members: {
                where: eq(communityMembers.role, "lead"),
                with: {
                  user: { columns: { id: true, fullName: true, email: true } },
                },
              },
            },
          },
          department: {
            columns: {
              id: true,
              name: true,
              code: true,
              isActingHodActive: true,
              isActive: true,
            },
          },
          venue: {
            columns: { id: true, name: true, building: true, capacity: true },
          },
          creator: {
            columns: { id: true, fullName: true, email: true, role: true },
          },
          reviewer: {
            columns: { id: true, fullName: true, email: true, role: true },
          },
          coordinator: {
            columns: { id: true, fullName: true, email: true, role: true },
          },
          stage2Approvals: {
            with: {
              department: { columns: { id: true, name: true, code: true } },
              community: { columns: { id: true, name: true, code: true } },
            },
          },
          approvals: {
            orderBy: [asc(eventApprovals.createdAt)],
          },
          mentors: true,
          report: true,
        },
      }),
    ]);

    if (!eventRow) {
      return { ok: false, status: 404, error: "Event not found." };
    }

    if (!canViewEventDossier(session, eventRow)) {
      return {
        ok: false,
        status: 403,
        error: "Forbidden: You do not have permission to view this event dossier.",
      };
    }

    return {
      ok: true,
      data: {
        collegeSettings: settingsRow
          ? formatCollegeSettings(settingsRow)
          : defaultCollegeSettings(),
        event: formatCampusEvent(eventRow),
        coordinator: eventRow.coordinator
          ? {
              id: eventRow.coordinator.id,
              full_name: eventRow.coordinator.fullName,
              email: eventRow.coordinator.email,
              role: eventRow.coordinator.role,
            }
          : null,
      },
    };
  });
}

/**
 * Checks whether `session` can access the consolidated summary register.
 */
export function hasSummaryRegisterAccess(session: AuthSession): boolean {
  return (
    session.isPrincipal ||
    session.isVicePrincipal ||
    session.isAdmin ||
    session.isHod ||
    session.isActingHod ||
    session.isFic
  );
}

/**
 * Loads the consolidated NAAC/NBA summary register scoped to the caller's authority.
 */
export async function getSummaryRegister(
  filters: SummaryRegisterFilters,
  session: AuthSession
): Promise<WorkflowActionResult<SummaryRegisterPayload>> {
  if (!hasSummaryRegisterAccess(session)) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden: Executive, Admin, HOD, or FIC privileges required.",
    };
  }

  return withDbRetry(async (client) => {
    const conditions = [];

    if (filters.academicYear) {
      conditions.push(eq(events.academicYear, filters.academicYear));
    }
    if (filters.originType) {
      conditions.push(eq(events.originType, filters.originType));
    }
    if (filters.departmentId) {
      conditions.push(eq(events.departmentId, filters.departmentId));
    }
    if (filters.status) {
      conditions.push(eq(events.status, filters.status));
    }
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      if (!isNaN(start.getTime())) {
        conditions.push(gte(events.startTime, start));
      }
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        conditions.push(lte(events.endTime, end));
      }
    }

    const [settingsRow, eventRows] = await Promise.all([
      client.select().from(collegeSettings).limit(1).then((rows) => rows[0] ?? null),
      client.query.events.findMany({
        ...(conditions.length > 0 ? { where: and(...conditions) } : {}),
        orderBy: [desc(events.startTime)],
        limit: 500,
        with: {
          community: {
            columns: { id: true, name: true, code: true, scope: true },
          },
          department: {
            columns: { id: true, name: true, code: true },
          },
          venue: {
            columns: { id: true, name: true, building: true },
          },
          report: true,
        },
      }),
    ]);

    const isGlobalViewer =
      session.isPrincipal || session.isVicePrincipal || session.isAdmin;
    const hodSet = new Set(session.hodDepartments.map((d) => d.id));
    const ficSet = new Set(session.ficCommunities.map((c) => c.id));
    const searchLower = filters.search?.trim().toLowerCase() || "";

    const filteredRows = eventRows.filter((row) => {
      if (!isGlobalViewer) {
        const matchesDept = Boolean(row.departmentId && hodSet.has(row.departmentId));
        const matchesComm = Boolean(row.communityId && ficSet.has(row.communityId));
        if (!matchesDept && !matchesComm) return false;
      }

      if (filters.communityScope) {
        if (row.originType !== "community") return false;
        if (row.community?.scope !== filters.communityScope) return false;
      }

      if (searchLower) {
        const haystack = [
          row.title,
          row.referenceNumber || "",
          row.community?.name || "",
          row.department?.name || "",
          row.venue?.name || "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(searchLower)) return false;
      }

      return true;
    });

    const summaryRows: SummaryRegisterRow[] = filteredRows.map((row) => {
      const studentCount = Number(row.report?.studentCount ?? 0);
      const facultyCount = Number(row.report?.facultyCount ?? 0);
      const externalCount = Number(row.report?.externalCount ?? 0);
      const hostName =
        row.originType === "college"
          ? settingsRow?.shortCode || "College"
          : row.originType === "department"
          ? row.department?.name || "Department"
          : row.community?.name || "Community";
      const hostCode =
        row.originType === "college"
          ? settingsRow?.shortCode || "COLLEGE"
          : row.originType === "department"
          ? row.department?.code || null
          : row.community?.code || null;

      return {
        id: row.id,
        reference_number: row.referenceNumber ?? null,
        academic_year: row.academicYear ?? null,
        title: row.title,
        origin_type: row.originType,
        host_name: hostName,
        host_code: hostCode,
        community_scope: row.community?.scope ?? null,
        category: row.category,
        venue_name: row.venue?.name ?? row.locationName ?? null,
        start_time:
          row.startTime instanceof Date
            ? row.startTime.toISOString()
            : String(row.startTime),
        end_time:
          row.endTime instanceof Date
            ? row.endTime.toISOString()
            : String(row.endTime),
        status: row.status,
        estimated_budget: Number(row.estimatedBudget ?? 0),
        actual_fund_used: Number(row.report?.actualFundUsed ?? 0),
        funding_source: row.report?.fundingSource || row.fundingSource || "No Cost",
        student_count: studentCount,
        faculty_count: facultyCount,
        external_count: externalCount,
        total_participants: studentCount + facultyCount + externalCount,
      };
    });

    const totals = summaryRows.reduce(
      (acc, r) => ({
        totalEvents: acc.totalEvents + 1,
        totalParticipants: acc.totalParticipants + r.total_participants,
        totalEstimatedBudget: acc.totalEstimatedBudget + r.estimated_budget,
        totalActualFundUsed: acc.totalActualFundUsed + r.actual_fund_used,
      }),
      {
        totalEvents: 0,
        totalParticipants: 0,
        totalEstimatedBudget: 0,
        totalActualFundUsed: 0,
      }
    );

    const availableAcademicYears = Array.from(
      new Set(
        eventRows
          .map((r) => r.academicYear)
          .filter((y): y is string => Boolean(y))
      )
    ).sort((a, b) => b.localeCompare(a));

    return {
      ok: true,
      data: {
        collegeSettings: settingsRow
          ? formatCollegeSettings(settingsRow)
          : defaultCollegeSettings(),
        rows: summaryRows,
        totals,
        availableAcademicYears,
      },
    };
  });
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const raw = value === null || value === undefined ? "" : String(value);
  // Mitigate spreadsheet formula injection
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/**
 * Formats summary register rows as RFC-4180 CSV with formula-injection protection.
 */
export function formatSummaryCsv(rows: SummaryRegisterRow[]): string {
  const headers = [
    "Reference Number",
    "Academic Year",
    "Event Title",
    "Origin",
    "Host",
    "Community Scope",
    "Category",
    "Venue",
    "Start Time",
    "End Time",
    "Status",
    "Estimated Budget (INR)",
    "Actual Fund Used (INR)",
    "Funding Source",
    "Students",
    "Faculty",
    "External",
    "Total Participants",
  ];

  const lines = [headers.map(escapeCsvCell).join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.reference_number || "",
        row.academic_year || "",
        row.title,
        row.origin_type,
        row.host_name,
        row.community_scope || "",
        row.category,
        row.venue_name || "",
        row.start_time,
        row.end_time,
        row.status,
        row.estimated_budget,
        row.actual_fund_used,
        row.funding_source,
        row.student_count,
        row.faculty_count,
        row.external_count,
        row.total_participants,
      ]
        .map(escapeCsvCell)
        .join(",")
    );
  }
  return lines.join("\r\n");
}

/**
 * Loads the zero-login public QR authenticity projection for `/verify/[code]`.
 * Strips financial numbers, rejection remarks, and personal contact details.
 */
export async function getPublicVerifyPayload(
  rawCode: string
): Promise<WorkflowActionResult<PublicVerifyPayload>> {
  const decoded = decodeURIComponent(rawCode).trim().toUpperCase();
  if (!decoded) {
    return { ok: false, status: 400, error: "Invalid reference code." };
  }

  // Allow hyphenated URL variants like AISAT-2026-27-CSE-014 as fallback
  const slashCandidate =
    !decoded.includes("/") && /^[A-Z0-9]+-\d{4}-\d{2}-[A-Z0-9-]+-\d+$/.test(decoded)
      ? decoded.replace(
          /^([A-Z0-9]+)-(\d{4}-\d{2})-([A-Z0-9-]+)-(\d+)$/,
          "$1/$2/$3/$4"
        )
      : decoded;

  return withDbRetry(async (client) => {
    const [settingsRow, eventRow] = await Promise.all([
      client.select().from(collegeSettings).limit(1).then((rows) => rows[0] ?? null),
      client.query.events.findFirst({
        where: eq(events.referenceNumber, slashCandidate),
        with: {
          community: {
            columns: { id: true, name: true, code: true, scope: true },
          },
          department: {
            columns: { id: true, name: true, code: true },
          },
          venue: {
            columns: { id: true, name: true, building: true },
          },
          stage2Approvals: {
            with: {
              department: { columns: { id: true, name: true, code: true } },
              community: { columns: { id: true, name: true, code: true } },
            },
          },
          approvals: {
            orderBy: [asc(eventApprovals.createdAt)],
          },
        },
      }),
    ]);

    if (!eventRow || !eventRow.referenceNumber) {
      return {
        ok: false,
        status: 404,
        error: "No verified event record matches this reference number.",
      };
    }

    const college = settingsRow
      ? formatCollegeSettings(settingsRow)
      : defaultCollegeSettings();

    const hostName =
      eventRow.originType === "college"
        ? college.college_name
        : eventRow.originType === "department"
        ? eventRow.department?.name || "Department"
        : eventRow.community?.name || "Community";

    const hostCode =
      eventRow.originType === "college"
        ? college.short_code
        : eventRow.originType === "department"
        ? eventRow.department?.code || null
        : eventRow.community?.code || null;

    return {
      ok: true,
      data: {
        reference_number: eventRow.referenceNumber,
        academic_year: eventRow.academicYear ?? null,
        title: eventRow.title,
        origin_type: eventRow.originType,
        host_name: hostName,
        host_code: hostCode,
        community_scope: eventRow.community?.scope ?? null,
        category: eventRow.category,
        start_time:
          eventRow.startTime instanceof Date
            ? eventRow.startTime.toISOString()
            : String(eventRow.startTime),
        end_time:
          eventRow.endTime instanceof Date
            ? eventRow.endTime.toISOString()
            : String(eventRow.endTime),
        location_name: eventRow.locationName,
        venue_name: eventRow.venue?.name ?? null,
        venue_building: eventRow.venue?.building ?? null,
        status: eventRow.status,
        is_lead_time_overridden: Boolean(eventRow.isLeadTimeOverridden),
        college_name: college.college_name,
        college_short_code: college.short_code,
        letterhead_subtitle: college.letterhead_subtitle ?? null,
        co_hosts: (eventRow.stage2Approvals || [])
          .filter((s) => !s.isPrimary)
          .map((s) => ({
            entity_type: s.entityType === "community" ? "community" : "department",
            name: s.department?.name || s.community?.name || "Co-host",
            code: s.department?.code || s.community?.code || null,
          })),
        approval_chain: (eventRow.approvals || []).map((a) => ({
          id: a.id,
          stage: a.stage,
          action: a.action,
          actor_name_snapshot: a.actorNameSnapshot,
          actor_role_snapshot: a.actorRoleSnapshot,
          created_at:
            a.createdAt instanceof Date
              ? a.createdAt.toISOString()
              : String(a.createdAt),
        })),
      },
    };
  });
}
