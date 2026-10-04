import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST, PATCH } from "../route";
import type { QueryResult, QueryResultRow } from "pg";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
}));

import { getCurrentUser, type AuthSession } from "@/lib/auth";
import { query } from "@/lib/db";

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockQuery = vi.mocked(query);

function mockDbResult<T extends QueryResultRow>(rows: T[]): QueryResult<T> {
  return {
    rows,
    command: "SELECT",
    rowCount: rows.length,
    oid: 0,
    fields: [],
  };
}

describe("Admin Venues API (/api/admin/venues)", () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/venues", () => {
    it("returns 403 Forbidden for non-admin users", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(nonAdminSession);

      const res = await GET();
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Unauthorized admin access");
    });

    it("returns venues list for admin", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(adminSession);
      mockQuery.mockResolvedValueOnce(
        mockDbResult([
          {
            id: "v-1",
            campus_id: "campus-uuid-1",
            name: "Turing Auditorium",
            building: "CS",
            capacity: 250,
            is_active: true,
          },
        ])
      );

      const res = await GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.venues).toHaveLength(1);
      expect(data.venues[0].name).toBe("Turing Auditorium");
    });
  });

  describe("POST /api/admin/venues (Strict Zod Validation)", () => {
    it("returns 400 Bad Request when venue name is too short", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(adminSession);

      const req = new Request("http://localhost/api/admin/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "A", capacity: 100 }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Venue name must be at least 2 characters");
    });

    it("creates venue successfully with coerced numeric capacity", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(adminSession);

      const newVenue = {
        id: "new-venue-uuid",
        campus_id: "campus-uuid-1",
        name: "Seminar Hall B",
        building: "Academic Block 2",
        capacity: 150,
        address: "Block 2, 1st Floor",
        notes: null,
        is_active: true,
      };

      mockQuery.mockResolvedValueOnce(mockDbResult([newVenue]));

      const req = new Request("http://localhost/api/admin/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Seminar Hall B",
          building: "Academic Block 2",
          capacity: "150",
          address: "Block 2, 1st Floor",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.venue.name).toBe("Seminar Hall B");
      expect(data.venue.capacity).toBe(150);
    });
  });

  describe("PATCH /api/admin/venues (Active Status Toggle)", () => {
    it("returns 400 Bad Request when id is invalid UUID", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(adminSession);

      const req = new Request("http://localhost/api/admin/venues", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "invalid-uuid", is_active: false }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Invalid venue ID");
    });

    it("returns 404 when venue does not exist", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(adminSession);
      mockQuery.mockResolvedValueOnce(mockDbResult([]));

      const req = new Request("http://localhost/api/admin/venues", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "a1b2c3d4-e5f6-4890-a123-ef1234567890",
          is_active: false,
        }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain("Venue not found");
    });

    it("toggles venue active status successfully", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(adminSession);

      const updatedVenue = {
        id: "a1b2c3d4-e5f6-4890-a123-ef1234567890",
        name: "Turing Auditorium",
        is_active: false,
      };

      mockQuery.mockResolvedValueOnce(mockDbResult([updatedVenue]));

      const req = new Request("http://localhost/api/admin/venues", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "a1b2c3d4-e5f6-4890-a123-ef1234567890",
          is_active: false,
        }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.venue.is_active).toBe(false);
    });

  });
});
