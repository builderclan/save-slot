import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH, DELETE } from "../route";
import type { QueryResult, QueryResultRow, PoolClient } from "pg";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
  withTransaction: vi.fn(),
}));

import { getCurrentUser, type AuthSession } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockQuery = vi.mocked(query);
const mockWithTransaction = vi.mocked(withTransaction);

function mockDbResult<T extends QueryResultRow>(rows: T[]): QueryResult<T> {
  return {
    rows,
    command: "SELECT",
    rowCount: rows.length,
    oid: 0,
    fields: [],
  };
}

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

  beforeEach(() => {
    vi.clearAllMocks();
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
      mockQuery.mockResolvedValueOnce(mockDbResult([])); // Not found

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
        campus_id: "campus-uuid-1",
        name: "Old Name",
        slug: "old-name",
        category: "Tech",
        status: "approved",
      };
      mockQuery.mockResolvedValueOnce(mockDbResult([existing]));

      const updated = { ...existing, name: "New Name" };
      mockWithTransaction.mockImplementationOnce(async (cb) => {
        const fakeClient = {
          query: vi.fn().mockResolvedValue(mockDbResult([updated])),
        } as unknown as PoolClient;
        return cb(fakeClient);
      });

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
      mockWithTransaction.mockImplementationOnce(async (cb) => {
        const fakeClient = {
          query: vi.fn().mockResolvedValueOnce(mockDbResult([])), // community not found
        } as unknown as PoolClient;
        return cb(fakeClient);
      });

      const req = new Request("http://localhost/api/admin/communities/comm-999", { method: "DELETE" });
      const res = await DELETE(req, { params: Promise.resolve({ id: "comm-999" }) });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Community not found");
    });

    it("prevents deletion when active events are scheduled under this community", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(adminSession);
      mockWithTransaction.mockImplementationOnce(async (cb) => {
        const fakeClient = {
          query: vi
            .fn()
            .mockResolvedValueOnce(mockDbResult([{ id: "comm-1" }])) // community found
            .mockResolvedValueOnce(mockDbResult([{ count: "3", titles: "Hackathon, Workshop, Meetup" }])), // active events
        } as unknown as PoolClient;
        return cb(fakeClient);
      });

      const req = new Request("http://localhost/api/admin/communities/comm-1", { method: "DELETE" });
      const res = await DELETE(req, { params: Promise.resolve({ id: "comm-1" }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("3 upcoming or pending event(s)");
    });

    it("deletes community when no active events exist", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(adminSession);
      mockWithTransaction.mockImplementationOnce(async (cb) => {
        const fakeClient = {
          query: vi
            .fn()
            .mockResolvedValueOnce(mockDbResult([{ id: "comm-1" }])) // community found
            .mockResolvedValueOnce(mockDbResult([{ count: "0", titles: "" }])) // 0 active events
            .mockResolvedValueOnce(mockDbResult([])) // detach events
            .mockResolvedValueOnce(mockDbResult([])) // delete memberships
            .mockResolvedValueOnce(mockDbResult([{ id: "comm-1" }])), // delete community
        } as unknown as PoolClient;
        return cb(fakeClient);
      });

      const req = new Request("http://localhost/api/admin/communities/comm-1", { method: "DELETE" });
      const res = await DELETE(req, { params: Promise.resolve({ id: "comm-1" }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.deletedId).toBe("comm-1");
    });
  });
});
