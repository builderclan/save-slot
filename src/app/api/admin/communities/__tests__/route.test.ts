import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";
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
          campus_id: "campus-uuid-1",
          name: "Coding Club",
          slug: "coding-club",
          category: "Tech",
          status: "approved",
          member_count: 42,
          event_count: 5,
        },
      ];
      mockQuery.mockResolvedValueOnce(mockDbResult(mockComms));

      const res = await GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.communities).toHaveLength(1);
      expect(data.communities[0].name).toBe("Coding Club");
      expect(data.communities[0].member_count).toBe(42);
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
      mockQuery.mockResolvedValueOnce(mockDbResult([{ id: "existing-id" }]));

      const req = new Request("http://localhost/api/admin/communities", {
        method: "POST",
        body: JSON.stringify({ name: "Coding Club", slug: "coding-club", category: "Tech" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("already exists");
    });

    it("returns 400 if admin profile is missing campus_id", async () => {
      mockGetCurrentUser.mockResolvedValueOnce({
        ...adminSession,
        profile: { ...adminSession.profile, campus_id: "" },
      });

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
      expect(data.error).toContain("Admin profile is not associated with any campus");
    });

    it("returns 400 if assigned lead user does not exist or is ineligible", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(adminSession);
      mockQuery
        .mockResolvedValueOnce(mockDbResult([])) // No collision
        .mockResolvedValueOnce(mockDbResult([])); // Lead user not found in campus

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
      expect(data.error).toContain("Assigned lead user does not exist in this campus or is not eligible");
    });

    it("creates community and returns 201 on success", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(adminSession);
      mockQuery
        .mockResolvedValueOnce(mockDbResult([])) // No collision
        .mockResolvedValueOnce(mockDbResult([{ id: "a0000000-0000-4000-8000-000000000001" }])); // Lead user found & eligible

      const createdComm = {
        id: "new-comm-uuid",
        campus_id: "campus-uuid-1",
        name: "Robotics Club",
        slug: "robotics-club",
        category: "Tech",
        status: "approved",
      };

      mockWithTransaction.mockImplementationOnce(async (cb) => {
        const fakeClient = {
          query: vi.fn().mockResolvedValue(mockDbResult([createdComm])),
        } as unknown as PoolClient;
        return cb(fakeClient);
      });

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
