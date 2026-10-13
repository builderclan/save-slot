import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/campus", () => ({
  getPrimaryCampusId: vi.fn(),
}));

const {
  mockSelect,
  mockSelectFrom,
  mockSelectWhere,
  mockSelectLimit,
  mockSelectOrderBy,
  mockInsert,
  mockInsertValues,
  mockInsertReturning,
  mockInsertOnConflictDoUpdate,
  mockExecute,
  mockTransaction,
} = vi.hoisted(() => {
  const mockSelectLimit = vi.fn();
  const mockSelectOrderBy = vi.fn();
  const mockSelectWhere = vi.fn();
  const mockSelectFrom = vi.fn();
  const mockSelect = vi.fn();

  const mockInsertReturning = vi.fn();
  const mockInsertOnConflictDoUpdate = vi.fn();
  const mockInsertValues = vi.fn();
  const mockInsert = vi.fn();

  const mockExecute = vi.fn();
  const mockTransaction = vi.fn();

  return {
    mockSelect,
    mockSelectFrom,
    mockSelectWhere,
    mockSelectLimit,
    mockSelectOrderBy,
    mockInsert,
    mockInsertValues,
    mockInsertReturning,
    mockInsertOnConflictDoUpdate,
    mockExecute,
    mockTransaction,
  };
});

vi.mock("@/lib/db", () => {
  const mockDbClient = {
    select: mockSelect,
    insert: mockInsert,
    execute: mockExecute,
    transaction: mockTransaction,
  };

  return {
    db: mockDbClient,
    withDbRetry: (op: (client: typeof mockDbClient) => Promise<unknown>) => op(mockDbClient),
  };
});

import { getCurrentUser, type AuthSession } from "@/lib/auth";
import { getPrimaryCampusId } from "@/lib/campus";

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockGetPrimaryCampusId = vi.mocked(getPrimaryCampusId);

describe("Admin Users API (/api/admin/users)", () => {
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
    mockGetPrimaryCampusId.mockResolvedValue("campus-uuid-1");

    mockSelectLimit.mockResolvedValue([]);
    mockSelectOrderBy.mockResolvedValue([]);
    mockSelectWhere.mockReturnValue({
      limit: mockSelectLimit,
      orderBy: mockSelectOrderBy,
    });
    mockSelectFrom.mockReturnValue({
      where: mockSelectWhere,
      orderBy: mockSelectOrderBy,
    });
    mockSelect.mockReturnValue({
      from: mockSelectFrom,
    });

    mockInsertReturning.mockResolvedValue([]);
    mockInsertOnConflictDoUpdate.mockResolvedValue([]);
    mockInsertValues.mockReturnValue({
      returning: mockInsertReturning,
      onConflictDoUpdate: mockInsertOnConflictDoUpdate,
    });
    mockInsert.mockReturnValue({
      values: mockInsertValues,
    });

    mockExecute.mockResolvedValue({ rows: [] });

    mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      const mockTx = {
        select: mockSelect,
        insert: mockInsert,
        execute: mockExecute,
      };
      return callback(mockTx);
    });
  });

  describe("GET /api/admin/users", () => {
    it("should reject non-admin with 403", async () => {
      mockGetCurrentUser.mockResolvedValue(studentSession);
      const res = await GET();
      expect(res.status).toBe(403);
    });

    it("should return users list formatted with admin community metadata", async () => {
      mockGetCurrentUser.mockResolvedValue(adminSession);
      mockSelectOrderBy.mockResolvedValue([
        {
          id: "u-1",
          email: "lead@campus.edu",
          fullName: "Lead User",
          role: "organizer",
          avatarUrl: null,
          campusId: "campus-uuid-1",
          createdAt: new Date("2026-01-01T00:00:00Z"),
          communityId: "comm-1",
          communityName: "Robotics Club",
        },
      ]);

      const res = await GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.users).toHaveLength(1);
      expect(data.users[0].id).toBe("u-1");
      expect(data.users[0].full_name).toBe("Lead User");
      expect(data.users[0].community_id).toBe("comm-1");
      expect(data.users[0].community_name).toBe("Robotics Club");
    });
  });

  describe("POST /api/admin/users", () => {
    const validBody = {
      fullName: "Jane Organizer",
      email: "jane@campus.edu",
      password: "SecurePassword123!",
      role: "organizer",
      communityId: "a0000000-0000-4000-8000-000000000001",
    };

    it("should reject non-admin with 403", async () => {
      mockGetCurrentUser.mockResolvedValue(studentSession);
      const req = new Request("http://localhost/api/admin/users", {
        method: "POST",
        body: JSON.stringify(validBody),
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it("should return 400 for invalid body schema", async () => {
      mockGetCurrentUser.mockResolvedValue(adminSession);
      const req = new Request("http://localhost/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ email: "not-an-email" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("should return 400 when email already exists", async () => {
      mockGetCurrentUser.mockResolvedValue(adminSession);
      mockSelectWhere.mockReturnValue({
        limit: mockSelectLimit.mockResolvedValue([{ id: "existing-user-id" }]),
      });

      const req = new Request("http://localhost/api/admin/users", {
        method: "POST",
        body: JSON.stringify(validBody),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("A user with this email already exists.");
    });

    it("should return 400 when no active campus exists", async () => {
      mockGetCurrentUser.mockResolvedValue({
        ...adminSession,
        profile: { ...adminSession.profile, campus_id: undefined },
      });
      mockGetPrimaryCampusId.mockResolvedValue("");

      const req = new Request("http://localhost/api/admin/users", {
        method: "POST",
        body: JSON.stringify(validBody),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("No active campus found");
    });

    it("should create user in transaction and assign community lead", async () => {
      mockGetCurrentUser.mockResolvedValue(adminSession);
      mockSelectWhere.mockReturnValue({
        limit: mockSelectLimit.mockResolvedValue([]),
      });

      mockInsertReturning.mockResolvedValue([
        {
          id: "new-user-id",
          email: "jane@campus.edu",
          fullName: "Jane Organizer",
          role: "organizer",
          campusId: "campus-uuid-1",
          createdAt: new Date("2026-01-01T00:00:00Z"),
        },
      ]);

      const req = new Request("http://localhost/api/admin/users", {
        method: "POST",
        body: JSON.stringify(validBody),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.id).toBe("new-user-id");
      expect(data.user.full_name).toBe("Jane Organizer");
      expect(mockExecute).toHaveBeenCalledTimes(2); // auth.users, auth.identities
      expect(mockInsert).toHaveBeenCalledTimes(2); // users, communityMembers
    });

    it("should return 400 when unique constraint violation 23505 occurs on concurrent insert", async () => {
      mockGetCurrentUser.mockResolvedValue(adminSession);
      mockSelectWhere.mockReturnValue({
        limit: mockSelectLimit.mockResolvedValue([]),
      });

      mockTransaction.mockRejectedValueOnce(Object.assign(new Error("duplicate key value violates unique constraint"), { code: "23505" }));

      const req = new Request("http://localhost/api/admin/users", {
        method: "POST",
        body: JSON.stringify(validBody),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("A user with this email already exists.");
    });
  });
});
