import { NextResponse } from "next/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getCurrentUser, AuthSession } from "@/server/auth";
import { withDbRetry } from "@/lib/db";
import { formatCampusEvent, formatDepartment } from "@/db/adapters";
import {
  communityMembers,
  departments,
  eventApprovals,
  eventStage2Approvals,
  events,
} from "@/db/schema";
import { Stage2ApproveSchema, Stage2RejectSchema } from "@/lib/validations";
import { safeRevalidatePath } from "@/lib/revalidate";
import { decideStage2Event } from "@/server/workflows";

/**
 * Loads events requiring or having received Stage 2 review from the caller's
 * scoped Department (`hod`) or Community (`fic`) entities.
 */
export async function fetchStage2QueueForSession(
  session: AuthSession,
  scope: "hod" | "fic"
) {
  const ownedIds =
    scope === "hod"
      ? session.hodDepartments.map((d) => d.id)
      : session.ficCommunities.map((c) => c.id);

  if (ownedIds.length === 0) {
    return {
      events: [],
      scopedDepartments: [],
      scopedCommunities: session.ficCommunities,
    };
  }

  return withDbRetry(async (client) => {
    const stage2Matches = await client
      .select({ eventId: eventStage2Approvals.eventId })
      .from(eventStage2Approvals)
      .where(
        scope === "hod"
          ? and(
              eq(eventStage2Approvals.entityType, "department"),
              inArray(eventStage2Approvals.departmentId, ownedIds)
            )
          : and(
              eq(eventStage2Approvals.entityType, "community"),
              inArray(eventStage2Approvals.communityId, ownedIds)
            )
      );

    const eventIds = Array.from(new Set(stage2Matches.map((m) => m.eventId)));

    const [eventRows, deptRows] = await Promise.all([
      eventIds.length > 0
        ? client.query.events.findMany({
            where: inArray(events.id, eventIds),
            orderBy: [desc(events.startTime)],
            limit: 150,
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
          })
        : Promise.resolve([]),
      scope === "hod"
        ? client.query.departments.findMany({
            where: inArray(departments.id, ownedIds),
            with: {
              hod: { columns: { id: true, fullName: true, email: true } },
              actingHod: { columns: { id: true, fullName: true, email: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    return {
      events: eventRows.map(formatCampusEvent),
      scopedDepartments: deptRows.map(formatDepartment),
      scopedCommunities: session.ficCommunities,
    };
  });
}

function hasStage2ScopeAccess(session: AuthSession, scope: "hod" | "fic"): boolean {
  return scope === "hod"
    ? session.isHod || session.isActingHod
    : session.isFic;
}

export async function handleStage2QueueGet(scope: "hod" | "fic") {
  const session = await getCurrentUser();
  if (!session || !hasStage2ScopeAccess(session, scope)) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
  }

  const data = await fetchStage2QueueForSession(session, scope);
  return NextResponse.json(data);
}

export async function handleStage2DecisionPost(
  request: Request,
  eventId: string,
  scope: "hod" | "fic",
  decision: "approve" | "reject"
) {
  const session = await getCurrentUser();
  if (!session || !hasStage2ScopeAccess(session, scope)) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
  }

  const rawBody = await request.json().catch(() => ({}));
  let remarks: string | null = null;

  if (decision === "approve") {
    const parsed = Stage2ApproveSchema.safeParse(rawBody || {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid approval remarks" },
        { status: 400 }
      );
    }
    remarks = parsed.data.remarks ?? null;
  } else {
    const parsed = Stage2RejectSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Rejection reason is required" },
        { status: 400 }
      );
    }
    remarks = parsed.data.rejectionReason;
  }

  const result = await decideStage2Event({
    eventId,
    actorSession: session,
    scope,
    decision,
    remarks,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  safeRevalidatePath("/hod");
  safeRevalidatePath("/fic");
  safeRevalidatePath("/lead");
  safeRevalidatePath("/principal");

  return NextResponse.json({ success: true, ...result.data });
}
