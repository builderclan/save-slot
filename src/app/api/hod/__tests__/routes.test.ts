import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/revalidate", () => ({
  safeRevalidatePath: vi.fn(),
}));

vi.mock("@/server/notifications", () => ({
  dispatchNotifications: vi.fn(),
}));

vi.mock("@/server/workflows", () => ({
  decideStage2Event: vi.fn(),
}));

const mockDeptUpdateSetWhere = vi.fn().mockResolvedValue([]);
const mockDeptUpdate = vi.fn().mockReturnValue({
  set: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Computer Science",
          code: "CSE",
          hodUserId: "hod-1",
          actingHodUserId: "staff-1",
          isActingHodActive: true,
          isActive: true,
        },
      ]),
    }),
  }),
});
const mockSelect = vi.fn();

vi.mock("@/lib/db", () => ({
  withDbRetry: vi.fn((op: (client: unknown) => Promise<unknown>) =>
    op({
      transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
        cb({
          select: mockSelect,
          update: mockDeptUpdate,
        })
      ),
      select: mockSelect,
      query: {
        events: { findMany: vi.fn().mockResolvedValue([]) },
        departments: { findMany: vi.fn().mockResolvedValue([]) },
      },
    })
  ),
}));

import { GET as hodQueueGet } from "../queue/route";
import { PATCH as hodActingTogglePatch } from "../acting-hod/route";
import { POST as ficApprovePost } from "../../fic/events/[id]/approve/route";
import { getCurrentUser, type AuthSession } from "@/server/auth";
import { decideStage2Event } from "@/server/workflows";

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockDecideStage2 = vi.mocked(decideStage2Event);

function makeHodSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    userId: "hod-1",
    email: "hod.cse@aisat.ac.in",
    profile: { id: "hod-1", email: "hod.cse@aisat.ac.in", full_name: "Dr. Anitha", role: "hod" },
    leadCommunities: [],
    ficCommunities: [],
    hodDepartments: [
      { id: "11111111-1111-4111-8111-111111111111", name: "CSE", code: "CSE", isActing: false },
    ],
    isAdmin: false,
    isPrincipal: false,
    isVicePrincipal: false,
    isHod: true,
    isActingHod: false,
    isFic: false,
    isStaff: false,
    isLead: false,
    ...overrides,
  };
}

describe("Stage 2 HOD & FIC API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    void mockDeptUpdateSetWhere;
  });

  it("rejects non-HOD users on GET /api/hod/queue with 403", async () => {
    mockGetCurrentUser.mockResolvedValue(
      makeHodSession({ isHod: false, isActingHod: false, hodDepartments: [] })
    );
    const res = await hodQueueGet();
    expect(res.status).toBe(403);
  });

  it("forbids an Acting HOD from toggling leave cover off via PATCH /api/hod/acting-hod", async () => {
    mockGetCurrentUser.mockResolvedValue(
      makeHodSession({
        userId: "staff-1",
        isHod: false,
        isActingHod: true,
        profile: { id: "staff-1", email: "staff.cse@aisat.ac.in", full_name: "Prof. Arun", role: "staff" },
      })
    );

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          for: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: "11111111-1111-4111-8111-111111111111",
                name: "CSE",
                code: "CSE",
                hodUserId: "hod-1",
                actingHodUserId: "staff-1",
                isActingHodActive: true,
                isActive: true,
              },
            ]),
          }),
        }),
      }),
    });

    const res = await hodActingTogglePatch(
      new Request("http://localhost/api/hod/acting-hod", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActingHodActive: false }),
      })
    );

    expect(res.status).toBe(403);
  });

  it("allows primary HOD to activate Acting HOD cover mode", async () => {
    mockGetCurrentUser.mockResolvedValue(makeHodSession());
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          for: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: "11111111-1111-4111-8111-111111111111",
                name: "CSE",
                code: "CSE",
                hodUserId: "hod-1",
                actingHodUserId: "staff-1",
                isActingHodActive: false,
                isActive: true,
              },
            ]),
          }),
        }),
      }),
    });

    const res = await hodActingTogglePatch(
      new Request("http://localhost/api/hod/acting-hod", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActingHodActive: true }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.department.is_acting_hod_active).toBe(true);
  });

  it("forwards FIC approval to decideStage2Event with scope='fic'", async () => {
    mockGetCurrentUser.mockResolvedValue(
      makeHodSession({
        userId: "fic-1",
        isHod: false,
        isFic: true,
        hodDepartments: [],
        ficCommunities: [
          {
            id: "comm-1",
            name: "IEEE SB",
            slug: "ieee",
            code: "IEEE",
            scope: "external",
            category: "Tech",
          },
        ],
      })
    );
    mockDecideStage2.mockResolvedValue({
      ok: true,
      data: { status: "pending_executive", allStage2Approved: true },
    });

    const res = await ficApprovePost(
      new Request("http://localhost/api/fic/events/ev-1/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks: "Looks great" }),
      }),
      { params: Promise.resolve({ id: "ev-1" }) }
    );

    expect(res.status).toBe(200);
    expect(mockDecideStage2).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "ev-1",
        scope: "fic",
        decision: "approve",
      })
    );
  });
});
