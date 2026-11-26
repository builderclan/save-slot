import { describe, it, expect, vi, beforeEach } from "vitest";
import { addDays } from "date-fns";

vi.mock("@/server/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/revalidate", () => ({
  safeRevalidatePath: vi.fn(),
}));

vi.mock("@/server/workspace", () => ({
  hasWorkspaceAccess: vi.fn(
    (s) => Boolean(s && (s.isLead || s.isStaff || s.isFic || s.isHod || s.isActingHod || s.isPrincipal))
  ),
  canManageHostOrigin: vi.fn(),
  canAccessWorkspaceEvent: vi.fn(() => true),
  fetchWorkspaceEvents: vi.fn(),
  slugifyTitle: vi.fn(() => "mock-event-1234"),
  verifyHostEntitiesExist: vi.fn(async () => null),
  validateSubmissionPreconditions: vi.fn(),
}));

vi.mock("@/server/reports/overdue", () => ({
  getOverdueClosureEvents: vi.fn(),
}));

vi.mock("@/server/conflicts", () => ({
  assertVenueSlotAvailableForTx: vi.fn(),
}));

vi.mock("@/server/workflows", () => ({
  buildStage2Entities: vi.fn(() => [
    { entityType: "department", departmentId: "11111111-1111-4111-8111-111111111111", communityId: null, isPrimary: true },
  ]),
  submitOrResubmitProposalToStage2Tx: vi.fn(),
}));

const mockInsertValues = vi.fn();
const mockInsert = vi.fn().mockReturnValue({
  values: mockInsertValues,
});
const mockSelect = vi.fn();

vi.mock("@/lib/db", () => ({
  withDbRetry: vi.fn((op: (client: unknown) => Promise<unknown>) =>
    op({
      transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
        cb({
          insert: mockInsert,
          select: mockSelect,
        })
      ),
    })
  ),
}));

import { GET, POST } from "../route";
import { getCurrentUser, type AuthSession } from "@/server/auth";
import {
  canManageHostOrigin,
  fetchWorkspaceEvents,
  validateSubmissionPreconditions,
} from "@/server/workspace";
import { getOverdueClosureEvents } from "@/server/reports/overdue";
import { assertVenueSlotAvailableForTx } from "@/server/conflicts";
import { submitOrResubmitProposalToStage2Tx } from "@/server/workflows";

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockCanManageHostOrigin = vi.mocked(canManageHostOrigin);
const mockFetchWorkspaceEvents = vi.mocked(fetchWorkspaceEvents);
const mockValidatePreconditions = vi.mocked(validateSubmissionPreconditions);
const mockGetOverdue = vi.mocked(getOverdueClosureEvents);
const mockAssertSlot = vi.mocked(assertVenueSlotAvailableForTx);
const mockSubmitStage2 = vi.mocked(submitOrResubmitProposalToStage2Tx);

function makeStaffSession(): AuthSession {
  return {
    userId: "staff-1",
    email: "staff.cse@aisat.ac.in",
    profile: {
      id: "staff-1",
      email: "staff.cse@aisat.ac.in",
      full_name: "Prof. Arun Kumar",
      role: "staff",
      department_id: "11111111-1111-4111-8111-111111111111",
    },
    leadCommunities: [],
    ficCommunities: [],
    hodDepartments: [],
    isAdmin: false,
    isPrincipal: false,
    isVicePrincipal: false,
    isHod: false,
    isActingHod: false,
    isFic: false,
    isStaff: true,
    isLead: false,
  };
}

describe("Workspace Events API (/api/workspace/events)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns hydrated workspace events and overdueReports", async () => {
    mockGetCurrentUser.mockResolvedValue(makeStaffSession());
    mockFetchWorkspaceEvents.mockResolvedValue([]);
    mockGetOverdue.mockResolvedValue([
      {
        id: "past-1",
        title: "Overdue Event",
        reference_number: "AISAT/2026-27/CSE/001",
        start_time: "2026-09-01T10:00:00.000Z",
        end_time: "2026-09-01T12:00:00.000Z",
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.events).toEqual([]);
    expect(body.overdueReports).toHaveLength(1);
    expect(body.overdueReports[0].id).toBe("past-1");
  });

  it("POST blocks submission with 403 OVERDUE_REPORTS_BLOCK when overdue closure reports exist", async () => {
    mockGetCurrentUser.mockResolvedValue(makeStaffSession());
    mockCanManageHostOrigin.mockReturnValue(true);
    mockValidatePreconditions.mockResolvedValue({
      ok: false,
      status: 403,
      code: "OVERDUE_REPORTS_BLOCK",
      error: "Action blocked: overdue reports",
      overdueReports: [
        {
          id: "past-1",
          title: "Overdue Event",
          reference_number: "AISAT/2026-27/CSE/001",
          start_time: "2026-09-01T10:00:00.000Z",
          end_time: "2026-09-01T12:00:00.000Z",
        },
      ],
    });

    const start = addDays(new Date(), 10);
    const end = new Date(start.getTime() + 7200000);

    const res = await POST(
      new Request("http://localhost/api/workspace/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originType: "department",
          departmentId: "11111111-1111-4111-8111-111111111111",
          title: "Distributed DB Colloquium",
          category: "Academic",
          venueId: "22222222-2222-4222-8222-222222222222",
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          description: "Detailed technical talk on distributed transactions.",
          action: "submit",
        }),
      })
    );

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.code).toBe("OVERDUE_REPORTS_BLOCK");
    expect(data.overdueReports).toHaveLength(1);
  });

  it("POST creates a department proposal and initializes Stage 2 approvals", async () => {
    mockGetCurrentUser.mockResolvedValue(makeStaffSession());
    mockCanManageHostOrigin.mockReturnValue(true);
    mockValidatePreconditions.mockResolvedValue({ ok: true });
    mockAssertSlot.mockResolvedValue({ ok: true, venueName: "Turing Auditorium" });

    const createdRow = {
      id: "ev-created-1",
      originType: "department",
      communityId: null,
      departmentId: "11111111-1111-4111-8111-111111111111",
      venueId: "22222222-2222-4222-8222-222222222222",
      title: "Distributed DB Colloquium",
      slug: "mock-event-1234",
      description: "Detailed technical talk on distributed transactions.",
      category: "Academic",
      targetAudience: ["All Students"],
      startTime: addDays(new Date(), 10),
      endTime: new Date(addDays(new Date(), 10).getTime() + 7200000),
      locationName: "Turing Auditorium",
      status: "pending_stage2",
    };

    mockInsertValues.mockImplementation(() => ({
      returning: vi.fn().mockResolvedValue([createdRow]),
      then: (r: (v: unknown) => unknown) => Promise.resolve([]).then(r),
    }));
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([createdRow]),
        }),
      }),
    });

    const start = addDays(new Date(), 10);
    const end = new Date(start.getTime() + 7200000);

    const res = await POST(
      new Request("http://localhost/api/workspace/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originType: "department",
          departmentId: "11111111-1111-4111-8111-111111111111",
          title: "Distributed DB Colloquium",
          category: "Academic",
          venueId: "22222222-2222-4222-8222-222222222222",
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          description: "Detailed technical talk on distributed transactions.",
          estimatedBudget: 5000,
          fundingSource: "Department Fund",
          mentors: [
            {
              name: "Dr. Menon",
              roleTitle: "Principal Engineer",
              organization: "CDAC",
              mentorType: "external",
            },
          ],
          action: "submit",
        }),
      })
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.event.origin_type).toBe("department");
    expect(mockSubmitStage2).toHaveBeenCalledTimes(1);
  });
});
