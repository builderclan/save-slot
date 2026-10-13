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
  mockSelectLeftJoin,
  mockSelectDistinctOn,
  mockSelectFor,
  mockInsert,
  mockInsertValues,
  mockInsertReturning,
  mockInsertOnConflictDoUpdate,
  mockUpdate,
  mockUpdateSet,
  mockUpdateWhere,
  mockUpdateReturning,
  mockDelete,
  mockDeleteWhere,
  mockDeleteReturning,
  mockTransaction,
} = vi.hoisted(() => {
  const mockSelectLimit = vi.fn();
  const mockSelectOrderBy = vi.fn();
  const mockSelectFor = vi.fn();
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

  const mockDeleteReturning = vi.fn();
  const mockDeleteWhere = vi.fn();
  const mockDelete = vi.fn();

  const mockTransaction = vi.fn();

  return {
    mockSelect,
    mockSelectFrom,
    mockSelectWhere,
    mockSelectLimit,
    mockSelectOrderBy,
    mockSelectLeftJoin,
    mockSelectDistinctOn,
    mockSelectFor,
    mockInsert,
    mockInsertValues,
    mockInsertReturning,
    mockInsertOnConflictDoUpdate,
    mockUpdate,
    mockUpdateSet,
    mockUpdateWhere,
    mockUpdateReturning,
    mockDelete,
    mockDeleteWhere,
    mockDeleteReturning,
    mockTransaction,
  };
});

vi.mock("@/lib/db", () => {
  const mockDbClient = {
    select: mockSelect,
    selectDistinctOn: mockSelectDistinctOn,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    transaction: mockTransaction,
  };

  return {
    db: mockDbClient,
    withDbRetry: (op: (client: typeof mockDbClient) => Promise<unknown>) => op(mockDbClient),
  };
});

import { getCurrentUser, type AuthSession } from "@/lib/auth";

const mockGetCurrentUser = vi.mocked(getCurrentUser);

describe("Admin Community [id] API (/api/admin/communities/[id])", () => {
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

  const createSelectChain = (rows: unknown[] = []) => ({
    limit: mockSelectLimit,
    orderBy: mockSelectOrderBy,
    for: mockSelectFor,
    then: (resolve: (val: unknown) => void, reject?: (err: unknown) => void) =>
      Promise.resolve(rows).then(resolve, reject),
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Select chaining
    mockSelectLimit.mockResolvedValue([]);
    mockSelectOrderBy.mockResolvedValue([]);
    mockSelectFor.mockResolvedValue([]);
    mockSelectWhere.mockImplementation(() => createSelectChain([]));
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

    // Insert chaining
    mockInsertReturning.mockResolvedValue([]);
    mockInsertOnConflictDoUpdate.mockResolvedValue([]);
    mockInsertValues.mockReturnValue({
      returning: mockInsertReturning,
      onConflictDoUpdate: mockInsertOnConflictDoUpdate,
    });
    mockInsert.mockReturnValue({
      values: mockInsertValues,
    });

    // Update chaining
    mockUpdateReturning.mockResolvedValue([]);
    mockUpdateWhere.mockReturnValue({
      returning: mockUpdateReturning,
      then: (resolve: (val: unknown) => void, reject?: (err: unknown) => void) =>
        Promise.resolve([]).then(resolve, reject),
    });
    mockUpdateSet.mockReturnValue({
      where: mockUpdateWhere,
    });
    mockUpdate.mockReturnValue({
      set: mockUpdateSet,
    });

    // Delete chaining
    mockDeleteReturning.mockResolvedValue([]);
    mockDeleteWhere.mockReturnValue({
      returning: mockDeleteReturning,
      then: (resolve: (val: unknown) => void, reject?: (err: unknown) => void) =>
        Promise.resolve([]).then(resolve, reject),
    });
    mockDelete.mockReturnValue({
      where: mockDeleteWhere,
    });

    // Transaction
    mockTransaction.mockImplementation(async (cb) => {
      const tx = {
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
      };
      return cb(tx);
    });
  });

  describe("GET /api/admin/communities/[id]", () => {
    it("returns 403 Forbidden for non-admin", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(studentSession);
      const req = new Request("http://localhost/api/admin/communities/comm-1");
      const res = await GET(req, { params: Promise.resolve({ id: "comm-1" }) });
      expect(res.status).toBe(403);
    });

    it("returns 404 if community not found", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(adminSession);
      mockSelectLimit.mockResolvedValueOnce([]); // Not found

      const req = new Request("http://localhost/api/admin/communities/comm-1");
      const res = await GET(req, { params: Promise.resolve({ id: "comm-1" }) });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Community not found");
    });

    it("returns community details on success", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(adminSession);
      const existing = {
        id: "comm-1",
        campusId: "campus-uuid-1",
        name: "Coding Club",
        slug: "coding-club",
        category: "Tech",
        status: "approved",
        memberCount: 25,
        eventCount: 3,
        leadId: "lead-1",
        leadName: "Lead Person",
        leadEmail: "lead@campus.edu",
      };
      mockSelectLimit.mockResolvedValueOnce([existing]);

      const req = new Request("http://localhost/api/admin/communities/comm-1");
      const res = await GET(req, { params: Promise.resolve({ id: "comm-1" }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.community.name).toBe("Coding Club");
      expect(data.community.member_count).toBe(25);
    });
  });

  describe("PATCH /api/admin/communities/[id]", () => {
    it("returns 403 Forbidden for non-admin", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(studentSession);
      const req = new Request("http://localhost/api/admin/communities/comm-1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Name" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "comm-1" }) });
      expect(res.status).toBe(403);
    });

    it("returns 404 if community not found", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(adminSession);
      mockSelectLimit.mockResolvedValueOnce([]); // Not found

      const req = new Request("http://localhost/api/admin/communities/comm-1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Name" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "comm-1" }) });
      expect(res.status).toBe(404);
    });

    it("updates community successfully", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(adminSession);
      const existing = {
        id: "comm-1",
        campusId: "campus-uuid-1",
        name: "Old Name",
        slug: "old-name",
        category: "Tech",
        status: "approved",
      };
      mockSelectLimit.mockResolvedValueOnce([existing]);

      const updated = { ...existing, name: "New Name" };
      mockUpdateReturning.mockResolvedValueOnce([updated]);

      const req = new Request("http://localhost/api/admin/communities/comm-1", {
        method: "PATCH",
        body: JSON.stringify({ name: "New Name" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "comm-1" }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.community.name).toBe("New Name");
    });
  });

  describe("DELETE /api/admin/communities/[id]", () => {
    it("returns 403 Forbidden for non-admin", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(studentSession);
      const req = new Request("http://localhost/api/admin/communities/comm-1", { method: "DELETE" });
      const res = await DELETE(req, { params: Promise.resolve({ id: "comm-1" }) });
      expect(res.status).toBe(403);
    });

    it("returns 404 if community not found or belongs to another campus", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(adminSession);
      mockSelectFor.mockResolvedValueOnce([]); // community not found

      const req = new Request("http://localhost/api/admin/communities/comm-999", { method: "DELETE" });
      const res = await DELETE(req, { params: Promise.resolve({ id: "comm-999" }) });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Community not found");
    });

    it("prevents deletion when active events are scheduled under this community", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(adminSession);
      mockSelectFor.mockResolvedValueOnce([{ id: "comm-1" }]); // community locked
      mockSelectWhere
        .mockImplementationOnce(() => createSelectChain([]))
        .mockImplementationOnce(() =>
          createSelectChain([
            { id: "event-1", title: "Hackathon" },
            { id: "event-2", title: "Workshop" },
          ])
        );

      const req = new Request("http://localhost/api/admin/communities/comm-1", { method: "DELETE" });
      const res = await DELETE(req, { params: Promise.resolve({ id: "comm-1" }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("upcoming or pending event(s)");
    });

    it("deletes community when no active events exist", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(adminSession);
      // 1. Lock community
      mockSelectFor.mockResolvedValueOnce([{ id: "comm-1" }]);
      // 2. Active events check (0) & 3. Prior leads
      mockSelectWhere
        .mockImplementationOnce(() => createSelectChain([]))
        .mockImplementationOnce(() => createSelectChain([]))
        .mockImplementationOnce(() => createSelectChain([{ userId: "lead-user-1" }]));

      // 4. Delete community returning
      mockDeleteReturning.mockResolvedValueOnce([{ id: "comm-1" }]);

      const req = new Request("http://localhost/api/admin/communities/comm-1", { method: "DELETE" });
      const res = await DELETE(req, { params: Promise.resolve({ id: "comm-1" }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.deletedId).toBe("comm-1");
    });
  });
});
