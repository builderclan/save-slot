import { describe, it, expect, vi, beforeEach } from "vitest";
import { addDays } from "date-fns";

const mockTxInsert = vi.fn();
const mockTxUpdate = vi.fn();
const mockTxDelete = vi.fn();
const mockTxSelect = vi.fn();

const mockTransaction = vi.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
  cb({
    select: mockTxSelect,
    insert: mockTxInsert,
    update: mockTxUpdate,
    delete: mockTxDelete,
  })
);

vi.mock("@/lib/db", () => ({
  withDbRetry: vi.fn((op: (client: unknown) => Promise<unknown>) =>
    op({
      transaction: mockTransaction,
      select: mockTxSelect,
      insert: mockTxInsert,
      update: mockTxUpdate,
      delete: mockTxDelete,
    })
  ),
}));

import {
  buildStage2Entities,
  decideExecutiveEvent,
  decideStage2Event,
  generateEventReferenceNumber,
} from "../workflows";
import { dispatchNotifications } from "../notifications";
import { getOverdueClosureEvents } from "../reports/overdue";
import type { AuthSession } from "@/server/auth";

function makeSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    userId: "user-1",
    email: "actor@aisat.ac.in",
    profile: {
      id: "user-1",
      email: "actor@aisat.ac.in",
      full_name: "Test Actor",
      role: "hod",
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
    isStaff: false,
    isLead: false,
    ...overrides,
  };
}

function makeSelectChain(rowsQueue: unknown[][]) {
  mockTxSelect.mockImplementation(() => {
    const rows = rowsQueue.shift() ?? [];
    const chain = {
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue(rows),
      for: vi.fn().mockImplementation(() => {
        const forChain = {
          limit: vi.fn().mockResolvedValue(rows),
          then: (resolve: (v: unknown) => unknown) => Promise.resolve(rows).then(resolve),
        };
        return forChain;
      }),
      limit: vi.fn().mockResolvedValue(rows),
      then: (resolve: (v: unknown) => unknown) => Promise.resolve(rows).then(resolve),
    };
    return chain;
  });
}

describe("Phase 2 Server Core (workflows, notifications, overdue)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTxUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });
    mockTxDelete.mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    });
    mockTxInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ lastSeq: 1 }]),
        }),
        then: (resolve: (v: unknown) => unknown) => Promise.resolve([]).then(resolve),
      }),
    });
  });

  describe("buildStage2Entities()", () => {
    it("places primary host first and deduplicates duplicate co-hosts", () => {
      const entities = buildStage2Entities(
        { entityType: "department", id: "dept-cse" },
        [
          { entityType: "department", id: "dept-cse" },
          { entityType: "department", id: "dept-ai" },
          { entityType: "community", id: "comm-cc" },
          { entityType: "community", id: "comm-cc" },
        ]
      );

      expect(entities).toEqual([
        {
          entityType: "department",
          departmentId: "dept-cse",
          communityId: null,
          isPrimary: true,
        },
        {
          entityType: "department",
          departmentId: "dept-ai",
          communityId: null,
          isPrimary: false,
        },
        {
          entityType: "community",
          departmentId: null,
          communityId: "comm-cc",
          isPrimary: false,
        },
      ]);
    });
  });

  describe("generateEventReferenceNumber()", () => {
    it("formats AISAT/<YYYY-YY>/<HOST>/<NNN> with atomic counter increment", async () => {
      makeSelectChain([[{ shortCode: "AISAT", academicYearStartMonth: 7, timezone: "Asia/Kolkata" }]]);
      mockTxInsert.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ lastSeq: 14 }]),
          }),
        }),
      });

      const res = await generateEventReferenceNumber(
        { select: mockTxSelect, insert: mockTxInsert } as never,
        { hostCode: "cse", eventStartTime: new Date("2026-10-15T10:00:00Z") }
      );

      expect(res.academicYear).toBe("2026-27");
      expect(res.referenceNumber).toBe("AISAT/2026-27/CSE/014");
    });
  });

  describe("decideStage2Event()", () => {
    it("keeps event in pending_stage2 until all parallel co-host entities approve", async () => {
      const hodSession = makeSession({
        userId: "hod-cse",
        isHod: true,
        hodDepartments: [{ id: "dept-cse", name: "CSE", code: "CSE", isActing: false }],
      });

      makeSelectChain([
        [{ id: "ev-1", title: "Joint Hackathon", status: "pending_stage2", createdBy: "lead-1" }],
        [
          {
            id: "s2-1",
            eventId: "ev-1",
            entityType: "department",
            departmentId: "dept-cse",
            communityId: null,
            approvalStatus: "pending",
          },
          {
            id: "s2-2",
            eventId: "ev-1",
            entityType: "community",
            departmentId: null,
            communityId: "comm-cc",
            approvalStatus: "pending",
          },
        ],
      ]);

      const res = await decideStage2Event({
        eventId: "ev-1",
        actorSession: hodSession,
        scope: "hod",
        decision: "approve",
      });

      expect(res).toEqual({
        ok: true,
        data: { status: "pending_stage2", allStage2Approved: false },
      });
    });

    it("advances to pending_executive once all Stage 2 entities are approved", async () => {
      const ficSession = makeSession({
        userId: "fic-cc",
        profile: { id: "fic-cc", email: "fic@aisat.ac.in", full_name: "FIC", role: "fic" },
        isFic: true,
        ficCommunities: [
          { id: "comm-cc", name: "Coding Club", slug: "coding-club", code: "CC", scope: "internal", category: "Tech" },
        ],
      });

      makeSelectChain([
        [{ id: "ev-1", title: "Joint Hackathon", status: "pending_stage2", createdBy: "lead-1" }],
        [
          {
            id: "s2-1",
            eventId: "ev-1",
            entityType: "department",
            departmentId: "dept-cse",
            communityId: null,
            approvalStatus: "approved",
          },
          {
            id: "s2-2",
            eventId: "ev-1",
            entityType: "community",
            departmentId: null,
            communityId: "comm-cc",
            approvalStatus: "pending",
          },
        ],
        [{ id: "principal-1" }],
      ]);

      const res = await decideStage2Event({
        eventId: "ev-1",
        actorSession: ficSession,
        scope: "fic",
        decision: "approve",
      });

      expect(res).toEqual({
        ok: true,
        data: { status: "pending_executive", allStage2Approved: true },
      });
    });

    it("requires a mandatory rejection reason of at least 5 characters", async () => {
      const res = await decideStage2Event({
        eventId: "ev-1",
        actorSession: makeSession({
          isHod: true,
          hodDepartments: [{ id: "dept-cse", name: "CSE", code: "CSE", isActing: false }],
        }),
        scope: "hod",
        decision: "reject",
        remarks: "no",
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.status).toBe(400);
      }
    });
  });

  describe("decideExecutiveEvent()", () => {
    it("blocks approval within 7 days unless overrideLeadTime is explicitly confirmed", async () => {
      const principalSession = makeSession({
        userId: "principal-1",
        profile: {
          id: "principal-1",
          email: "principal@aisat.ac.in",
          full_name: "Principal",
          role: "principal",
        },
        isPrincipal: true,
      });

      const nearStart = addDays(new Date(), 3);
      const nearEnd = addDays(nearStart, 0);
      nearEnd.setHours(nearStart.getHours() + 2);

      makeSelectChain([
        [
          {
            id: "ev-urgent",
            title: "Urgent Seminar",
            status: "pending_executive",
            originType: "department",
            departmentId: "dept-cse",
            communityId: null,
            venueId: "venue-1",
            startTime: nearStart,
            endTime: nearEnd,
            createdBy: "staff-1",
          },
        ],
      ]);

      const res = await decideExecutiveEvent({
        eventId: "ev-urgent",
        actorSession: principalSession,
        decision: "approve",
        overrideLeadTime: false,
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.status).toBe(409);
        expect(res.code).toBe("LEAD_TIME_OVERRIDE_REQUIRED");
      }
    });
  });

  describe("dispatchNotifications() & getOverdueClosureEvents()", () => {
    it("deduplicates notifications per (userId, eventId, type)", async () => {
      const valuesSpy = vi.fn().mockResolvedValue([]);
      const fakeClient = {
        insert: vi.fn().mockReturnValue({ values: valuesSpy }),
      };

      await dispatchNotifications(fakeClient as never, [
        { userId: "u-1", eventId: "ev-1", type: "stage2_pending", title: "A", message: "M1" },
        { userId: "u-1", eventId: "ev-1", type: "stage2_pending", title: "A", message: "M1" },
        { userId: "u-2", eventId: "ev-1", type: "stage2_pending", title: "A", message: "M1" },
      ]);

      expect(valuesSpy).toHaveBeenCalledTimes(1);
      expect(valuesSpy.mock.calls[0][0]).toHaveLength(2);
    });

    it("formats overdue published events missing closure reports", async () => {
      makeSelectChain([
        [
          {
            id: "ev-past",
            title: "Past Tech Talk",
            referenceNumber: "AISAT/2026-27/CSE/002",
            startTime: new Date("2026-09-01T10:00:00Z"),
            endTime: new Date("2026-09-01T12:00:00Z"),
          },
        ],
      ]);

      const overdue = await getOverdueClosureEvents(
        { select: mockTxSelect } as never,
        "staff-1",
        new Date("2026-10-01T00:00:00Z")
      );

      expect(overdue).toEqual([
        {
          id: "ev-past",
          title: "Past Tech Talk",
          reference_number: "AISAT/2026-27/CSE/002",
          start_time: "2026-09-01T10:00:00.000Z",
          end_time: "2026-09-01T12:00:00.000Z",
        },
      ]);
    });
  });
});
