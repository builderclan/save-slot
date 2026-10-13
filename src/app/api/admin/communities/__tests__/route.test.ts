import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";
import type { QueryResult, QueryResultRow } from "pg";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const {
  mockSelect,
  mockSelectFrom,
  mockSelectWhere,
  mockSelectLimit,
  mockSelectOrderBy,
  mockSelectLeftJoin,
  mockSelectDistinctOn,
  mockInsert,
  mockInsertValues,
  mockInsertReturning,
  mockInsertOnConflictDoUpdate,
  mockUpdate,
  mockUpdateSet,
  mockUpdateWhere,
  mockUpdateReturning,
  mockTransaction,
  mockQuery,
} = vi.hoisted(() => {
  const mockSelectLimit = vi.fn();
  const mockSelectOrderBy = vi.fn();
  const mockSelectWhere = vi.fn();
  const mockSelectLeftJoin = vi.fn();
  const mockSelectFrom = vi.fn();
  const mockSelectDistinctOn = vi.fn();
  const mockSelect = vi.fn();

  const mockInsertReturning = vi.fn();
  const mockInsertOnConflictDoUpdate = vi.fn();
  const mockInsertValues = vi.fn();
  const mockInsert = vi.fn();

  const mockUpdateReturning = vi.fn();
  const mockUpdateWhere = vi.fn();
  const mockUpdateSet = vi.fn();
  const mockUpdate = vi.fn();

  const mockTransaction = vi.fn();
  const mockQuery = vi.fn();

  return {
    mockSelect,
    mockSelectFrom,
    mockSelectWhere,
    mockSelectLimit,
    mockSelectOrderBy,
    mockSelectLeftJoin,
    mockSelectDistinctOn,
    mockInsert,
    mockInsertValues,
    mockInsertReturning,
    mockInsertOnConflictDoUpdate,
    mockUpdate,
    mockUpdateSet,
    mockUpdateWhere,
    mockUpdateReturning,
    mockTransaction,
    mockQuery,
  };
});

vi.mock("@/lib/db", () => {
  const mockDbClient = {
    select: mockSelect,
    selectDistinctOn: mockSelectDistinctOn,
    insert: mockInsert,
    update: mockUpdate,
    transaction: mockTransaction,
  };

  return {
    db: mockDbClient,
    query: mockQuery,
    withDbRetry: (op: (client: typeof mockDbClient) => Promise<unknown>) => op(mockDbClient),
  };
});

import { getCurrentUser, type AuthSession } from "@/lib/auth";
import { resetCampusCache } from "@/lib/campus";

const mockGetCurrentUser = vi.mocked(getCurrentUser);

function mockDbResult<T extends QueryResultRow>(rows: T[]): QueryResult<T> {
  return {
    rows,
    command: "SELECT",
    rowCount: rows.length,
    oid: 0,
    fields: [],
  };
}

describe("Admin Communities API (/api/admin/communities)", () => {
  const adminSession: AuthSession = {
    userId: "admin-1",
    email: "admin@campus.edu",
    profile: {
      id: "admin-1",
      email: "admin@campus.edu",
      full_name: "Admin User",
      role: "admin",
      campus_id: "campus-uuid-1",
    },
    isAdmin: true,
    isPrincipal: false,
    isVicePrincipal: false,
    isLead: false,
    leadCommunities: [],
  };

  const studentSession: AuthSession = {
    userId: "student-1",
    email: "student@campus.edu",
    profile: {
      id: "student-1",
      email: "student@campus.edu",
      full_name: "Student",
      role: "student",
      campus_id: "campus-uuid-1",
    },
    isAdmin: false,
    isPrincipal: false,
    isVicePrincipal: false,
    isLead: false,
    leadCommunities: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCampusCache();

    // Default Select chains
    mockSelectLimit.mockResolvedValue([]);
    mockSelectOrderBy.mockResolvedValue([]);
    mockSelectWhere.mockReturnValue({
      limit: mockSelectLimit,
      orderBy: mockSelectOrderBy,
    });
    mockSelectLeftJoin.mockReturnValue({
      leftJoin: mockSelectLeftJoin,
      where: mockSelectWhere,
      orderBy: mockSelectOrderBy,
    });
    mockSelectFrom.mockReturnValue({
      where: mockSelectWhere,
      leftJoin: mockSelectLeftJoin,
      orderBy: mockSelectOrderBy,
    });
    mockSelectDistinctOn.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            as: vi.fn().mockReturnValue("cm_lead"),
          }),
        }),
      }),
    });
    mockSelect.mockReturnValue({
      from: mockSelectFrom,
    });

    // Default Insert chains
    mockInsertReturning.mockResolvedValue([]);
    mockInsertOnConflictDoUpdate.mockResolvedValue([]);
    mockInsertValues.mockReturnValue({
      returning: mockInsertReturning,
      onConflictDoUpdate: mockInsertOnConflictDoUpdate,
    });
    mockInsert.mockReturnValue({
      values: mockInsertValues,
    });

    // Default Update chains
    mockUpdateReturning.mockResolvedValue([]);
    mockUpdateWhere.mockReturnValue({
      returning: mockUpdateReturning,
    });
    mockUpdateSet.mockReturnValue({
      where: mockUpdateWhere,
    });
    mockUpdate.mockReturnValue({
      set: mockUpdateSet,
    });

    // Default Transaction
    mockTransaction.mockImplementation(async (cb) => {
      const tx = {
        insert: mockInsert,
        update: mockUpdate,
        select: mockSelect,
      };
      return cb(tx);
    });
  });

  describe("GET /api/admin/communities", () => {
    it("returns 403 Forbidden for non-admin", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(studentSession);
      const res = await GET();
      expect(res.status).toBe(403);
    });

    it("returns communities list for admin", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(adminSession);
      const mockComms = [
        {
          id: "comm-1",
          campusId: "campus-uuid-1",
          name: "Coding Club",
          slug: "coding-club",
          category: "Tech",
          status: "approved",
          memberCount: 42,
          eventCount: 5,
        },
      ];
      mockSelectOrderBy.mockResolvedValueOnce(mockComms);

      const res = await GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.communities).toHaveLength(1);
      expect(data.communities[0].name).toBe("Coding Club");
      expect(data.communities[0].member_count).toBe(42);
      expect(data.communities[0].event_count).toBe(5);
    });
  });

  describe("POST /api/admin/communities", () => {
    it("returns 403 Forbidden for non-admin", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(studentSession);
      const req = new Request("http://localhost/api/admin/communities", {
        method: "POST",
        body: JSON.stringify({ name: "Robotics Club", category: "Tech" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it("returns 400 for invalid validation data", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(adminSession);
      const req = new Request("http://localhost/api/admin/communities", {
        method: "POST",
        body: JSON.stringify({ name: "A", category: "Tech" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 if slug already exists on campus", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(adminSession);
      mockSelectLimit.mockResolvedValueOnce([{ id: "existing-id" }]);

      const req = new Request("http://localhost/api/admin/communities", {
        method: "POST",
        body: JSON.stringify({ name: "Coding Club", slug: "coding-club", category: "Tech" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("already exists");
    });

    it("returns 400 if admin profile is missing campus_id and no active campus exists", async () => {
      mockGetCurrentUser.mockResolvedValueOnce({
        ...adminSession,
        profile: { ...adminSession.profile, campus_id: "" },
      });
      mockQuery
        .mockResolvedValueOnce(mockDbResult([])) // No campus in database
        .mockResolvedValueOnce(mockDbResult([])); // Seed attempt returns empty

      const req = new Request("http://localhost/api/admin/communities", {
        method: "POST",
        body: JSON.stringify({
          name: "Robotics Club",
          category: "Tech",
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("No active campus found in the system");
    });

    it("automatically falls back to primary campus if admin profile is missing campus_id", async () => {
      mockGetCurrentUser.mockResolvedValueOnce({
        ...adminSession,
        profile: { ...adminSession.profile, campus_id: "" },
      });
      mockQuery.mockResolvedValueOnce(mockDbResult([{ id: "campus-uuid-1" }])); // Fallback primary campus
      mockSelectLimit.mockResolvedValueOnce([]); // No slug collision

      const createdComm = {
        id: "new-comm-uuid",
        campusId: "campus-uuid-1",
        name: "Robotics Club",
        slug: "robotics-club",
        category: "Tech",
        status: "approved",
      };

      mockInsertReturning.mockResolvedValueOnce([createdComm]);

      const req = new Request("http://localhost/api/admin/communities", {
        method: "POST",
        body: JSON.stringify({
          name: "Robotics Club",
          category: "Tech",
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.community.campus_id).toBe("campus-uuid-1");
    });

    it("returns 400 if assigned lead user does not exist or is ineligible", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(adminSession);
      mockSelectLimit
        .mockResolvedValueOnce([]) // No collision
        .mockResolvedValueOnce([]); // Lead user not found in campus

      const req = new Request("http://localhost/api/admin/communities", {
        method: "POST",
        body: JSON.stringify({
          name: "Robotics Club",
          category: "Tech",
          leadUserId: "a0000000-0000-4000-8000-000000000001",
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Assigned lead user does not exist in this campus or is not an organizer");
    });

    it("creates community and returns 201 on success", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(adminSession);
      mockSelectLimit
        .mockResolvedValueOnce([]) // No collision
        .mockResolvedValueOnce([{ id: "a0000000-0000-4000-8000-000000000001" }]); // Lead user found & eligible

      const createdComm = {
        id: "new-comm-uuid",
        campusId: "campus-uuid-1",
        name: "Robotics Club",
        slug: "robotics-club",
        category: "Tech",
        status: "approved",
      };

      mockInsertReturning.mockResolvedValueOnce([createdComm]);
      mockUpdateReturning.mockResolvedValueOnce([{ id: "a0000000-0000-4000-8000-000000000001" }]);

      const req = new Request("http://localhost/api/admin/communities", {
        method: "POST",
        body: JSON.stringify({
          name: "Robotics Club",
          category: "Tech",
          leadUserId: "a0000000-0000-4000-8000-000000000001",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.community.name).toBe("Robotics Club");
    });
  });
});
