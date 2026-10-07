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

  const mockParams = Promise.resolve({ id: "user-target-id" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PATCH /api/admin/users/[id]", () => {
    it("should update user full name and role in transaction", async () => {
      mockGetCurrentUser.mockResolvedValue(adminSession);
      mockQuery.mockResolvedValueOnce(
        mockDbResult([{ id: "user-target-id", role: "organizer", email: "lead@campus.edu" }])
      );

      const mockClient = {
        query: vi.fn().mockResolvedValue(mockDbResult([])),
      } as unknown as PoolClient;

      mockWithTransaction.mockImplementation(async (callback) => {
        return callback(mockClient);
      });

      const req = new Request("http://localhost/api/admin/users/user-target-id", {
        method: "PATCH",
        body: JSON.stringify({
          fullName: "New Lead Name",
          role: "organizer",
        }),
      });

      const res = await PATCH(req, { params: mockParams });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockClient.query).toHaveBeenCalled();
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

    it("should delete another user in transaction", async () => {
      mockGetCurrentUser.mockResolvedValue(adminSession);
      mockQuery.mockResolvedValueOnce(
        mockDbResult([{ id: "user-target-id", email: "user@campus.edu" }])
      );

      const mockClient = {
        query: vi.fn().mockResolvedValue(mockDbResult([])),
      } as unknown as PoolClient;

      mockWithTransaction.mockImplementation(async (callback) => {
        return callback(mockClient);
      });

      const req = new Request("http://localhost/api/admin/users/user-target-id", {
        method: "DELETE",
      });

      const res = await DELETE(req, { params: mockParams });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockClient.query).toHaveBeenCalledTimes(4);
    });
  });
});
