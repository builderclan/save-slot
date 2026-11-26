import { asc, desc, eq, inArray, or } from "drizzle-orm";
import { differenceInCalendarDays } from "date-fns";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";
import { communities, communityMembers, departments, events } from "@/db/schema";
import { AuthSession } from "@/server/auth";
import { getOverdueClosureEvents, OverdueReportSummary } from "@/server/reports/overdue";

export type DbClientOrTx = NodePgDatabase<typeof schema>;

/**
 * Checks whether the caller holds proposer workspace privileges.
 */
export function hasWorkspaceAccess(session: AuthSession): boolean {
  return (
    session.isLead ||
    session.isStaff ||
    session.isFic ||
    session.isHod ||
    session.isActingHod ||
    session.isPrincipal ||
    session.isVicePrincipal
  );
}

/**
 * Validates whether `session` can propose or edit on behalf of the primary Community or Department.
 */
export function canManageHostOrigin(
  session: AuthSession,
  originType: "community" | "department",
  communityId?: string | null,
  departmentId?: string | null
): boolean {
  if (session.isPrincipal || session.isVicePrincipal) {
    return true;
  }

  if (originType === "community") {
    if (!communityId) return false;
    return session.leadCommunities.some((c) => c.id === communityId);
  }

  if (!departmentId) return false;
  return (
    session.profile.department_id === departmentId ||
    session.hodDepartments.some((d) => d.id === departmentId)
  );
}

/**
 * Checks whether `session` may view/manage a workspace event record.
 */
export function canAccessWorkspaceEvent(
  session: AuthSession,
  eventRow: {
    createdBy: string | null;
    coordinatorId: string | null;
    communityId: string | null;
    departmentId: string | null;
  }
): boolean {
  if (session.isPrincipal || session.isVicePrincipal) return true;
  if (eventRow.createdBy === session.userId || eventRow.coordinatorId === session.userId) {
    return true;
  }
  if (eventRow.communityId && session.leadCommunities.some((c) => c.id === eventRow.communityId)) {
    return true;
  }
  if (
    eventRow.departmentId &&
    (session.profile.department_id === eventRow.departmentId ||
      session.hodDepartments.some((d) => d.id === eventRow.departmentId))
  ) {
    return true;
  }
  return false;
}

/**
 * Resolves a human slug and loads hydrated workspace events visible to `session`.
 */
export function slugifyTitle(text: string): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "campus-event"}-${Date.now().toString().slice(-4)}`;
}

export async function fetchWorkspaceEvents(client: DbClientOrTx, session: AuthSession) {
  const leadCommunityIds = session.leadCommunities.map((c) => c.id);
  const ownedDepartmentIds = Array.from(
    new Set(
      [
        session.profile.department_id,
        ...session.hodDepartments.map((d) => d.id),
      ].filter((id): id is string => Boolean(id))
    )
  );

  const ownershipFilters = [
    eq(events.createdBy, session.userId),
    eq(events.coordinatorId, session.userId),
  ];
  if (leadCommunityIds.length > 0) {
    ownershipFilters.push(inArray(events.communityId, leadCommunityIds));
  }
  if (ownedDepartmentIds.length > 0) {
    ownershipFilters.push(inArray(events.departmentId, ownedDepartmentIds));
  }

  return client.query.events.findMany({
    ...(session.isPrincipal || session.isVicePrincipal
      ? {}
      : { where: or(...ownershipFilters) }),
    orderBy: [desc(events.startTime)],
    limit: 200,
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
              user: {
                columns: { id: true, fullName: true, email: true },
              },
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
        columns: {
          id: true,
          name: true,
          building: true,
          capacity: true,
        },
      },
      creator: {
        columns: { id: true, fullName: true, email: true, role: true },
      },
      reviewer: {
        columns: { id: true, fullName: true, email: true, role: true },
      },
      stage2Approvals: {
        with: {
          department: { columns: { id: true, name: true, code: true } },
          community: { columns: { id: true, name: true, code: true } },
        },
      },
      approvals: {
        orderBy: [asc(schema.eventApprovals.createdAt)],
      },
      mentors: true,
      report: true,
    },
  });
}

/**
 * Validates that the primary host and any requested co-hosts exist in the database.
 */
export async function verifyHostEntitiesExist(
  client: DbClientOrTx,
  entities: Array<{ entityType: "department" | "community"; id: string }>
): Promise<string | null> {
  const deptIds = Array.from(
    new Set(entities.filter((e) => e.entityType === "department").map((e) => e.id))
  );
  const commIds = Array.from(
    new Set(entities.filter((e) => e.entityType === "community").map((e) => e.id))
  );

  if (deptIds.length > 0) {
    const foundDepts = await client
      .select({ id: departments.id })
      .from(departments)
      .where(inArray(departments.id, deptIds));
    if (foundDepts.length !== deptIds.length) {
      return "One or more selected departments do not exist.";
    }
  }

  if (commIds.length > 0) {
    const foundComms = await client
      .select({ id: communities.id })
      .from(communities)
      .where(inArray(communities.id, commIds));
    if (foundComms.length !== commIds.length) {
      return "One or more selected communities do not exist.";
    }
  }

  return null;
}

/**
 * Enforces the 7-day notice rule and immediate post-end_time overdue report gate
 * for non-executive proposers before entering Stage 2.
 */
export async function validateSubmissionPreconditions(
  client: DbClientOrTx,
  session: AuthSession,
  startDate: Date
): Promise<
  | { ok: true }
  | {
      ok: false;
      status: number;
      error: string;
      code: "LEAD_TIME_VIOLATION" | "OVERDUE_REPORTS_BLOCK";
      overdueReports?: OverdueReportSummary[];
    }
> {
  if (session.isPrincipal || session.isVicePrincipal) {
    return { ok: true };
  }

  const diffDays = differenceInCalendarDays(startDate, new Date());
  if (diffDays < 7) {
    return {
      ok: false,
      status: 400,
      code: "LEAD_TIME_VIOLATION",
      error: `Campus policy requires at least 7 days advance notice before event start (selected date is ${diffDays} day(s) out).`,
    };
  }

  const overdueReports = await getOverdueClosureEvents(client, session.userId);
  if (overdueReports.length > 0) {
    return {
      ok: false,
      status: 403,
      code: "OVERDUE_REPORTS_BLOCK",
      error: `Action blocked: You have ${overdueReports.length} overdue post-event closure report(s). Submit pending closure reports before proposing a new event.`,
      overdueReports,
    };
  }

  return { ok: true };
}
