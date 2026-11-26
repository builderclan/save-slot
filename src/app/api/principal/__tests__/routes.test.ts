import { describe, it, expect, vi, beforeEach } from "vitest";
import { addDays } from "date-fns";

vi.mock("@/server/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/revalidate", () => ({
  safeRevalidatePath: vi.fn(),
}));

vi.mock("@/server/workflows", () => ({
  decideExecutiveEvent: vi.fn(),
  generateEventReferenceNumber: vi.fn(async () => ({
    referenceNumber: "AISAT/2026-27/AISAT/001",
    academicYear: "2026-27",
  })),
  recordApprovalAudit: vi.fn(),
  bumpCollidingEventsForCollegeTx: vi.fn(async () => ["colliding-ev-1"]),
}));

vi.mock("@/server/conflicts", () => ({
  findCollidingEventsForSlot: vi.fn(),
}));

vi.mock("@/server/notifications", () => ({
  dispatchNotifications: vi.fn(),
}));

vi.mock("@/server/workspace", () => ({
  slugifyTitle: vi.fn(() => "college-convocation-1234"),
}));

const mockSelect = vi.fn();
const mockInsertValues = vi.fn();
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
const mockUpdate = vi.fn().mockReturnValue({
  set: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([
        {
          id: "dept-1",
          name: "Mechanical Engineering",
          code: "ME",
          hodUserId: "hod-me",
          actingHodUserId: "staff-me",
          isActingHodActive: true,
          isActive: true,
        },
      ]),
    }),
  }),
});

vi.mock("@/lib/db", () => ({
  withDbRetry: vi.fn((op: (client: unknown) => Promise<unknown>) =>
    op({
      transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
        cb({
          select: mockSelect,
          insert: mockInsert,
          update: mockUpdate,
        })
      ),
    })
  ),
}));

import { POST as approvePost } from "../events/[id]/approve/route";
import { POST as collegeEventsPost } from "../college-events/route";
import { PATCH as emergencyTogglePatch } from "../departments/[id]/acting-hod/route";
import { getCurrentUser, type AuthSession } from "@/server/auth";
import { decideExecutiveEvent } from "@/server/workflows";
import { findCollidingEventsForSlot } from "@/server/conflicts";

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockDecideExecutive = vi.mocked(decideExecutiveEvent);
const mockFindCollisions = vi.mocked(findCollidingEventsForSlot);

function makePrincipalSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    userId: "principal-1",
    email: "principal@aisat.ac.in",
    profile: {
      id: "principal-1",
      email: "principal@aisat.ac.in",
      full_name: "Dr. S. Jose",
      role: "principal",
    },
    leadCommunities: [],
    ficCommunities: [],
    hodDepartments: [],
    isAdmin: false,
    isPrincipal: true,
    isVicePrincipal: false,
    isHod: false,
    isActingHod: false,
    isFic: false,
    isStaff: false,
    isLead: false,
    ...overrides,
  };
}

describe("Executive Desk API Routes (/api/principal/*)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("propagates 409 LEAD_TIME_OVERRIDE_REQUIRED when approving within 7 days without override", async () => {
    mockGetCurrentUser.mockResolvedValue(makePrincipalSession());
    mockDecideExecutive.mockResolvedValue({
      ok: false,
      status: 409,
      code: "LEAD_TIME_OVERRIDE_REQUIRED",
      error: "Explicit Principal/VP override confirmation is required.",
    });

    const res = await approvePost(
      new Request("http://localhost/api/principal/events/ev-1/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrideLeadTime: false }),
      }),
      { params: Promise.resolve({ id: "ev-1" }) }
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("LEAD_TIME_OVERRIDE_REQUIRED");
  });

  it("returns 409 COLLEGE_COLLISION_CONFIRM_REQUIRED when College event overlaps bookings without forceRescheduleEventIds", async () => {
    mockGetCurrentUser.mockResolvedValue(makePrincipalSession());

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          for: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: "11111111-1111-4111-8111-111111111111", name: "Turing Auditorium", isActive: true },
            ]),
          }),
        }),
      }),
    });

    const start = addDays(new Date(), 12);
    const end = new Date(start.getTime() + 7200000);

    mockFindCollisions.mockResolvedValue([
      {
        id: "22222222-2222-4222-8222-222222222222",
        title: "Department Workshop",
        status: "published",
        originType: "department",
        startTime: start,
        endTime: end,
        createdBy: "staff-1",
        coordinatorId: null,
        communityId: null,
        departmentId: "dept-1",
      },
    ]);

    const res = await collegeEventsPost(
      new Request("http://localhost/api/principal/college-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Annual Convocation",
          category: "Academic",
          venueId: "11111111-1111-4111-8111-111111111111",
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          description: "College-wide graduation and convocation ceremony.",
        }),
      })
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("COLLEGE_COLLISION_CONFIRM_REQUIRED");
    expect(body.collisions).toHaveLength(1);
  });

  it("publishes College event and bumps confirmed colliding bookings", async () => {
    mockGetCurrentUser.mockResolvedValue(makePrincipalSession());

    const start = addDays(new Date(), 12);
    const end = new Date(start.getTime() + 7200000);

    let selectCount = 0;
    mockSelect.mockImplementation(() => {
      selectCount++;
      if (selectCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              for: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  { id: "11111111-1111-4111-8111-111111111111", name: "Turing Auditorium", isActive: true },
                ]),
              }),
            }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ shortCode: "AISAT" }]),
        }),
      };
    });

    mockFindCollisions.mockResolvedValue([
      {
        id: "22222222-2222-4222-8222-222222222222",
        title: "Department Workshop",
        status: "published",
        originType: "department",
        startTime: start,
        endTime: end,
        createdBy: "staff-1",
        coordinatorId: null,
        communityId: null,
        departmentId: "dept-1",
      },
    ]);

    mockInsertValues.mockReturnValue({
      returning: vi.fn().mockResolvedValue([
        {
          id: "college-ev-1",
          originType: "college",
          title: "Annual Convocation",
          slug: "college-convocation-1234",
          description: "College-wide graduation and convocation ceremony.",
          category: "Academic",
          venueId: "11111111-1111-4111-8111-111111111111",
          startTime: start,
          endTime: end,
          locationName: "Turing Auditorium",
          referenceNumber: "AISAT/2026-27/AISAT/001",
          status: "published",
        },
      ]),
    });

    const res = await collegeEventsPost(
      new Request("http://localhost/api/principal/college-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Annual Convocation",
          category: "Academic",
          venueId: "11111111-1111-4111-8111-111111111111",
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          description: "College-wide graduation and convocation ceremony.",
          forceRescheduleEventIds: ["22222222-2222-4222-8222-222222222222"],
        }),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.event.origin_type).toBe("college");
    expect(body.bumpedEventIds).toEqual(["colliding-ev-1"]);
  });

  it("allows Principal/VP emergency Acting HOD toggle", async () => {
    mockGetCurrentUser.mockResolvedValue(
      makePrincipalSession({ isPrincipal: false, isVicePrincipal: true })
    );
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          for: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: "dept-1",
                name: "Mechanical Engineering",
                code: "ME",
                hodUserId: "hod-me",
                actingHodUserId: "staff-me",
                isActingHodActive: false,
                isActive: true,
              },
            ]),
          }),
        }),
      }),
    });

    const res = await emergencyTogglePatch(
      new Request("http://localhost/api/principal/departments/dept-1/acting-hod", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActingHodActive: true }),
      }),
      { params: Promise.resolve({ id: "dept-1" }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.department.is_acting_hod_active).toBe(true);
  });
});
