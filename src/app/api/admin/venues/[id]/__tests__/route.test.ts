import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH, DELETE } from "../route";
import type { QueryResult, QueryResultRow } from "pg";

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

describe("Admin Venue Details API (/api/admin/venues/[id])", () => {
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

  const nonAdminSession: AuthSession = {
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

  const mockParams = Promise.resolve({ id: "venue-uuid-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PATCH /api/admin/venues/[id]", () => {
    it("should reject unauthenticated or non-admin requests with 403", async () => {
      mockGetCurrentUser.mockResolvedValue(nonAdminSession);
      const req = new Request("http://localhost/api/admin/venues/venue-uuid-1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Venue" }),
      });
      const res = await PATCH(req, { params: mockParams });
      expect(res.status).toBe(403);
    });

    it("should update venue details successfully", async () => {
      mockGetCurrentUser.mockResolvedValue(adminSession);
      mockQuery.mockResolvedValueOnce(
        mockDbResult([
          {
            id: "venue-uuid-1",
            name: "Updated Lab",
            building: "Main Wing",
            capacity: 150,
            is_active: true,
          },
        ])
      );

      const req = new Request("http://localhost/api/admin/venues/venue-uuid-1", {
        method: "PATCH",
        body: JSON.stringify({
          name: "Updated Lab",
          capacity: 150,
        }),
      });

      const res = await PATCH(req, { params: mockParams });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.venue.name).toBe("Updated Lab");
    });
  });

  describe("DELETE /api/admin/venues/[id]", () => {
    it("should prevent deletion when upcoming events exist with 400", async () => {
      mockGetCurrentUser.mockResolvedValue(adminSession);
      mockQuery.mockResolvedValueOnce(
        mockDbResult([{ count: "2", titles: "Hackathon, Seminar" }])
      );

      const req = new Request("http://localhost/api/admin/venues/venue-uuid-1", {
        method: "DELETE",
      });

      const res = await DELETE(req, { params: mockParams });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("upcoming or pending event(s) are scheduled here");
    });

    it("should allow safe deletion when no active events are scheduled", async () => {
      mockGetCurrentUser.mockResolvedValue(adminSession);
      // 1. Check active events (0)
      mockQuery.mockResolvedValueOnce(mockDbResult([{ count: "0", titles: "" }]));

      const mockClient = {
        query: vi.fn().mockImplementation(async (sql: string) => {
          if (sql.includes("DELETE FROM public.venues")) {
            return mockDbResult([{ id: "venue-uuid-1" }]);
          }
          return mockDbResult([]);
        }),
      } as unknown as import("pg").PoolClient;

      mockWithTransaction.mockImplementation(async (callback) => {
        return callback(mockClient);
      });

      const req = new Request("http://localhost/api/admin/venues/venue-uuid-1", {
        method: "DELETE",
      });

      const res = await DELETE(req, { params: mockParams });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.deletedId).toBe("venue-uuid-1");
      expect(mockClient.query).toHaveBeenCalledTimes(2);
    });
  });
});
