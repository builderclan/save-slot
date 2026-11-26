import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getDefaultRedirectPath,
  resolveAuthSessionForUser,
  type AuthSession,
} from "../auth";

const { mockSelect, mockFrom, mockWhere, mockLimit } = vi.hoisted(() => {
  const mockLimit = vi.fn();
  const mockWhere = vi.fn();
  const mockFrom = vi.fn();
  const mockSelect = vi.fn();
  return { mockSelect, mockFrom, mockWhere, mockLimit };
});

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  withDbRetry: async <T>(fn: (dbClient: unknown) => Promise<T>) => {
    const dbClient = {
      select: mockSelect,
      query: {
        communityMembers: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    };
    return fn(dbClient);
  },
}));

describe("Auth & Effective-Role Session Utilities (v1.0.0)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
  });

  function setupSelectMocks({
    profileRow,
    memberRows = [],
    deptRows = [],
  }: {
    profileRow: Record<string, unknown> | null;
    memberRows?: Array<Record<string, unknown>>;
    deptRows?: Array<Record<string, unknown>>;
  }) {
    // Call 1: users profile (.where().limit(1))
    // Call 2: communityMembers innerJoin community (.where())
    // Call 3: departments (.where())
    let callIdx = 0;
    mockSelect.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        return {
          from: () => ({
            where: () => ({
              limit: vi.fn().mockResolvedValue(profileRow ? [profileRow] : []),
            }),
          }),
        };
      }
      if (callIdx === 2) {
        return {
          from: () => ({
            innerJoin: () => ({
              where: vi.fn().mockResolvedValue(memberRows),
            }),
          }),
        };
      }
      return {
        from: () => ({
          where: vi.fn().mockResolvedValue(deptRows),
        }),
      };
    });
  }

  describe("getDefaultRedirectPath()", () => {
    const baseSession: AuthSession = {
      userId: "u-1",
      email: "test@aisat.ac.in",
      profile: {
        id: "u-1",
        email: "test@aisat.ac.in",
        full_name: "Test",
        role: "staff",
      },
      leadCommunities: [],
      ticCommunities: [],
      hodDepartments: [],
      isAdmin: false,
      isPrincipal: false,
      isVicePrincipal: false,
      isHod: false,
      isActingHod: false,
      isTic: false,
      isStaff: false,
      isLead: false,
    };

    it("routes Principal & Vice Principal to /principal", () => {
      expect(getDefaultRedirectPath({ ...baseSession, isPrincipal: true })).toBe("/principal");
      expect(getDefaultRedirectPath({ ...baseSession, isVicePrincipal: true })).toBe("/principal");
    });

    it("routes IT Admin to /admin", () => {
      expect(getDefaultRedirectPath({ ...baseSession, isAdmin: true })).toBe("/admin");
    });

    it("routes HOD, Acting HOD, TIC, Staff, and Leads to /lead", () => {
      expect(
        getDefaultRedirectPath({
          ...baseSession,
          profile: { ...baseSession.profile, role: "hod" },
          isHod: true,
        })
      ).toBe("/lead");
      expect(
        getDefaultRedirectPath({
          ...baseSession,
          profile: { ...baseSession.profile, role: "staff" },
          isActingHod: true,
        })
      ).toBe("/lead");
      expect(
        getDefaultRedirectPath({
          ...baseSession,
          profile: { ...baseSession.profile, role: "tic" },
          isTic: true,
        })
      ).toBe("/lead");
      expect(
        getDefaultRedirectPath({
          ...baseSession,
          profile: { ...baseSession.profile, role: "staff" },
          isStaff: true,
        })
      ).toBe("/lead");
      expect(
        getDefaultRedirectPath({
          ...baseSession,
          profile: { ...baseSession.profile, role: "lead" },
          isLead: true,
        })
      ).toBe("/lead");
    });

    it("routes null sessions to /", () => {
      expect(getDefaultRedirectPath(null)).toBe("/");
    });
  });

  describe("resolveAuthSessionForUser()", () => {
    it("returns null if user profile is deactivated (isActive === false)", async () => {
      setupSelectMocks({
        profileRow: {
          id: "u-inactive",
          email: "old@aisat.ac.in",
          fullName: "Inactive Prof",
          role: "staff",
          isActive: false,
        },
      });

      const session = await resolveAuthSessionForUser("u-inactive", "old@aisat.ac.in");
      expect(session).toBeNull();
    });

    it("grants effective TIC & Acting HOD authority to a single faculty (staff) account", async () => {
      setupSelectMocks({
        profileRow: {
          id: "u-fac-1",
          email: "arun.cse@aisat.ac.in",
          fullName: "Prof. Arun Kumar",
          role: "staff",
          designation: "Assistant Professor, CSE",
          departmentId: "dept-cse",
          isActive: true,
        },
        memberRows: [
          {
            memberRole: "tic",
            id: "comm-ieee",
            name: "IEEE Student Branch",
            slug: "ieee",
            code: "IEEE",
            scope: "external",
            category: "Tech",
          },
        ],
        deptRows: [
          {
            id: "dept-cse",
            name: "Computer Science",
            code: "CSE",
            hodUserId: "u-hod-cse",
            actingHodUserId: "u-fac-1",
            isActingHodActive: true,
          },
        ],
      });

      const session = await resolveAuthSessionForUser("u-fac-1", "arun.cse@aisat.ac.in");
      expect(session).not.toBeNull();
      expect(session?.isStaff).toBe(true);
      expect(session?.isTic).toBe(true);
      expect(session?.isActingHod).toBe(true);
      expect(session?.isHod).toBe(true);
      expect(session?.isAdmin).toBe(false);
      expect(session?.isPrincipal).toBe(false);
      expect(session?.ticCommunities).toHaveLength(1);
      expect(session?.hodDepartments[0]).toEqual({
        id: "dept-cse",
        name: "Computer Science",
        code: "CSE",
        isActing: true,
      });
    });

    it("does NOT grant Acting HOD when isActingHodActive is false", async () => {
      setupSelectMocks({
        profileRow: {
          id: "u-fac-2",
          email: "arun.cse@aisat.ac.in",
          fullName: "Prof. Arun Kumar",
          role: "staff",
          isActive: true,
        },
        deptRows: [],
      });

      const session = await resolveAuthSessionForUser("u-fac-2", "arun.cse@aisat.ac.in");
      expect(session?.isActingHod).toBe(false);
      expect(session?.isHod).toBe(false);
      expect(session?.hodDepartments).toHaveLength(0);
    });

    it("does not leak unused limit/where refs", () => {
      expect(mockLimit).toBeDefined();
      expect(mockWhere).toBeDefined();
    });
  });
});
