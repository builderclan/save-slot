import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH, DELETE } from "../route";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
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
  mockUpdate,
  mockUpdateSet,
  mockUpdateWhere,
  mockDelete,
  mockDeleteWhere,
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

  const mockUpdateWhere = vi.fn();
  const mockUpdateSet = vi.fn();
  const mockUpdate = vi.fn();

  const mockDeleteWhere = vi.fn();
  const mockDelete = vi.fn();

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
    mockUpdate,
    mockUpdateSet,
    mockUpdateWhere,
    mockDelete,
    mockDeleteWhere,
    mockExecute,
    mockTransaction,
  };
});

vi.mock("@/lib/db", () => {
  const mockDbClient = {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    execute: mockExecute,
    transaction: mockTransaction,
  };

  return {
    db: mockDbClient,
    withDbRetry: (op: (client: typeof mockDbClient) => Promise<unknown>) => op(mockDbClient),
  };
});

import { getCurrentUser, type AuthSession } from "@/lib/auth";

const mockGetCurrentUser = vi.mocked(getCurrentUser);

describe("Admin User Details API (/api/admin/users/[id])", () => {
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

  const mockParams = Promise.resolve({ id: "user-target-id" });

  const createSelectChain = (rows: unknown[] = []) => ({
    limit: mockSelectLimit.mockResolvedValue(rows),
    orderBy: mockSelectOrderBy.mockResolvedValue(rows),
    then: (resolve: (val: unknown) => void, reject?: (err: unknown) => void) =>
      Promise.resolve(rows).then(resolve, reject),
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockSelectLimit.mockResolvedValue([]);
    mockSelectOrderBy.mockResolvedValue([]);
    mockSelectWhere.mockImplementation(() => createSelectChain([]));

    const mockLeadQueryChain = {
      where: vi.fn().mockReturnValue({
        groupBy: vi.fn().mockReturnValue({
          as: vi.fn().mockReturnValue("user_leads"),
        }),
      }),
    };

    const mockJoinChain = {
      where: mockSelectWhere,
      leftJoin: vi.fn(),
      orderBy: mockSelectOrderBy,
    };
    mockJoinChain.leftJoin.mockReturnValue(mockJoinChain);

    mockSelectFrom.mockReturnValue({
      where: mockSelectWhere,
      leftJoin: () => mockJoinChain,
      innerJoin: () => mockLeadQueryChain,
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

    mockUpdateWhere.mockResolvedValue([]);
    mockUpdateSet.mockReturnValue({
      where: mockUpdateWhere,
    });
    mockUpdate.mockReturnValue({
      set: mockUpdateSet,
    });

    mockDeleteWhere.mockResolvedValue([]);
    mockDelete.mockReturnValue({
      where: mockDeleteWhere,
    });

    mockExecute.mockResolvedValue({ rows: [] });

    mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      const mockTx = {
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
        execute: mockExecute,
        transaction: (spCallback: (sp: unknown) => Promise<unknown>) => spCallback(mockTx),
      };
      return callback(mockTx);
    });
  });

  describe("GET /api/admin/users/[id]", () => {
    it("should reject unauthenticated or non-admin users with 403", async () => {
      mockGetCurrentUser.mockResolvedValue(studentSession);
      const req = new Request("http://localhost/api/admin/users/user-target-id");
      const res = await GET(req, { params: mockParams });
      expect(res.status).toBe(403);
    });

    it("should return 404 when user is not found", async () => {
      mockGetCurrentUser.mockResolvedValue(adminSession);
      mockSelectWhere.mockReturnValue({
        limit: mockSelectLimit.mockResolvedValue([]),
      });

      const req = new Request("http://localhost/api/admin/users/user-target-id");
      const res = await GET(req, { params: mockParams });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("User not found");
    });

    it("should return 200 with formatted user details", async () => {
      mockGetCurrentUser.mockResolvedValue(adminSession);
      mockSelectWhere.mockReturnValue({
        limit: mockSelectLimit.mockResolvedValue([
          {
            id: "user-target-id",
            email: "organizer@campus.edu",
            fullName: "Alex Organizer",
            role: "organizer",
            avatarUrl: null,
            campusId: "campus-uuid-1",
            createdAt: new Date("2026-01-01T00:00:00Z"),
            communityId: "comm-1",
            communityName: "Robotics Club",
          },
        ]),
      });

      const req = new Request("http://localhost/api/admin/users/user-target-id");
      const res = await GET(req, { params: mockParams });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user.id).toBe("user-target-id");
      expect(data.user.full_name).toBe("Alex Organizer");
      expect(data.user.community_id).toBe("comm-1");
      expect(data.user.community_name).toBe("Robotics Club");
    });
  });

  describe("PATCH /api/admin/users/[id]", () => {
    it("should reject non-admin with 403", async () => {
      mockGetCurrentUser.mockResolvedValue(studentSession);
      const req = new Request("http://localhost/api/admin/users/user-target-id", {
        method: "PATCH",
        body: JSON.stringify({ fullName: "New Name" }),
      });
      const res = await PATCH(req, { params: mockParams });
      expect(res.status).toBe(403);
    });

    it("should return 400 on invalid body", async () => {
      mockGetCurrentUser.mockResolvedValue(adminSession);
      const req = new Request("http://localhost/api/admin/users/user-target-id", {
        method: "PATCH",
        body: JSON.stringify({ role: "invalid-role" }),
      });
      const res = await PATCH(req, { params: mockParams });
      expect(res.status).toBe(400);
    });

    it("should return 404 when target user is not found", async () => {
      mockGetCurrentUser.mockResolvedValue(adminSession);
      mockSelectWhere.mockReturnValue({
        limit: mockSelectLimit.mockResolvedValue([]),
      });

      const req = new Request("http://localhost/api/admin/users/user-target-id", {
        method: "PATCH",
        body: JSON.stringify({ fullName: "Updated Name" }),
      });
      const res = await PATCH(req, { params: mockParams });
      expect(res.status).toBe(404);
    });

    it("should update user full name, role, and community assignment in transaction", async () => {
      mockGetCurrentUser.mockResolvedValue(adminSession);
      mockSelectWhere.mockReturnValue({
        limit: mockSelectLimit.mockResolvedValue([
          { id: "user-target-id", role: "organizer", email: "lead@campus.edu" },
        ]),
      });

      const req = new Request("http://localhost/api/admin/users/user-target-id", {
        method: "PATCH",
        body: JSON.stringify({
          fullName: "New Lead Name",
          role: "organizer",
          communityId: "a0000000-0000-4000-8000-000000000001",
        }),
      });

      const res = await PATCH(req, { params: mockParams });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.id).toBe("user-target-id");
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockExecute).toHaveBeenCalled();
      expect(mockInsert).toHaveBeenCalled();
    });

    it("should remove lead associations when user is changed to non-organizer role", async () => {
      mockGetCurrentUser.mockResolvedValue(adminSession);
      mockSelectWhere.mockReturnValue({
        limit: mockSelectLimit.mockResolvedValue([
          { id: "user-target-id", role: "organizer", email: "lead@campus.edu" },
        ]),
      });

      const req = new Request("http://localhost/api/admin/users/user-target-id", {
        method: "PATCH",
        body: JSON.stringify({
          role: "admin",
        }),
      });

      const res = await PATCH(req, { params: mockParams });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockDelete).toHaveBeenCalled();
    });

    it("should preserve existing lead associations when updating only full name", async () => {
      mockGetCurrentUser.mockResolvedValue(adminSession);
      mockSelectWhere.mockReturnValue({
        limit: mockSelectLimit.mockResolvedValue([
          { id: "user-target-id", role: "organizer", email: "lead@campus.edu" },
        ]),
      });

      const req = new Request("http://localhost/api/admin/users/user-target-id", {
        method: "PATCH",
        body: JSON.stringify({
          fullName: "Updated Name Only",
        }),
      });

      const res = await PATCH(req, { params: mockParams });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockDelete).not.toHaveBeenCalled();
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("should preserve existing lead associations when role: organizer is resubmitted without communityId", async () => {
      mockGetCurrentUser.mockResolvedValue(adminSession);
      mockSelectWhere.mockReturnValue({
        limit: mockSelectLimit.mockResolvedValue([
          { id: "user-target-id", role: "organizer", email: "lead@campus.edu" },
        ]),
      });

      const req = new Request("http://localhost/api/admin/users/user-target-id", {
        method: "PATCH",
        body: JSON.stringify({
          fullName: "Updated Name",
          role: "organizer",
        }),
      });

      const res = await PATCH(req, { params: mockParams });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockDelete).not.toHaveBeenCalled();
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /api/admin/users/[id]", () => {
    it("should prevent deleting own admin account with 400", async () => {
      mockGetCurrentUser.mockResolvedValue(adminSession);
      const selfParams = Promise.resolve({ id: "admin-1" });

      const req = new Request("http://localhost/api/admin/users/admin-1", {
        method: "DELETE",
      });

      const res = await DELETE(req, { params: selfParams });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Cannot delete your own active administrator account");
    });

    it("should return 404 when target user is not found", async () => {
      mockGetCurrentUser.mockResolvedValue(adminSession);
      mockSelectWhere.mockReturnValue({
        limit: mockSelectLimit.mockResolvedValue([]),
      });

      const req = new Request("http://localhost/api/admin/users/user-target-id", {
        method: "DELETE",
      });

      const res = await DELETE(req, { params: mockParams });
      expect(res.status).toBe(404);
    });

    it("should delete another user in transaction across communityMembers, users, and auth tables", async () => {
      mockGetCurrentUser.mockResolvedValue(adminSession);
      mockSelectWhere.mockReturnValue({
        limit: mockSelectLimit.mockResolvedValue([
          { id: "user-target-id", email: "user@campus.edu" },
        ]),
      });

      const req = new Request("http://localhost/api/admin/users/user-target-id", {
        method: "DELETE",
      });

      const res = await DELETE(req, { params: mockParams });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.deletedId).toBe("user-target-id");
      expect(mockDelete).toHaveBeenCalledTimes(2);
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });
  });
});
