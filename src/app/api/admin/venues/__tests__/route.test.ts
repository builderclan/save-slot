import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST, PATCH } from "../route";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const {
  mockSelect,
  mockSelectFrom,
  mockSelectWhere,
  mockSelectOrderBy,
  mockInsert,
  mockInsertValues,
  mockInsertReturning,
  mockUpdate,
  mockUpdateSet,
  mockUpdateWhere,
  mockUpdateReturning,
} = vi.hoisted(() => {
  const mockSelectOrderBy = vi.fn();
  const mockSelectWhere = vi.fn();
  const mockSelectFrom = vi.fn();
  const mockSelect = vi.fn();

  const mockInsertReturning = vi.fn();
  const mockInsertValues = vi.fn();
  const mockInsert = vi.fn();

  const mockUpdateReturning = vi.fn();
  const mockUpdateWhere = vi.fn();
  const mockUpdateSet = vi.fn();
  const mockUpdate = vi.fn();

  mockSelectWhere.mockReturnValue({ orderBy: mockSelectOrderBy });
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere, orderBy: mockSelectOrderBy });
  mockSelect.mockReturnValue({ from: mockSelectFrom });

  mockInsertValues.mockReturnValue({ returning: mockInsertReturning });
  mockInsert.mockReturnValue({ values: mockInsertValues });

  mockUpdateWhere.mockReturnValue({ returning: mockUpdateReturning });
  mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
  mockUpdate.mockReturnValue({ set: mockUpdateSet });

  return {
    mockSelect,
    mockSelectFrom,
    mockSelectWhere,
    mockSelectOrderBy,
    mockInsert,
    mockInsertValues,
    mockInsertReturning,
    mockUpdate,
    mockUpdateSet,
    mockUpdateWhere,
    mockUpdateReturning,
  };
});

vi.mock("@/lib/db", () => {
  const mockDbClient = {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  };

  return {
    db: mockDbClient,
    withDbRetry: (op: (client: typeof mockDbClient) => Promise<unknown>) => op(mockDbClient),
  };
});

import { getCurrentUser, type AuthSession } from "@/lib/auth";

const mockGetCurrentUser = vi.mocked(getCurrentUser);

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
    mockSelectWhere.mockReturnValue({ orderBy: mockSelectOrderBy });
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere, orderBy: mockSelectOrderBy });
    mockSelect.mockReturnValue({ from: mockSelectFrom });
    mockInsertValues.mockReturnValue({ returning: mockInsertReturning });
    mockInsert.mockReturnValue({ values: mockInsertValues });
    mockUpdateWhere.mockReturnValue({ returning: mockUpdateReturning });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdate.mockReturnValue({ set: mockUpdateSet });
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
      mockSelectOrderBy.mockResolvedValueOnce([
        {
          id: "v-1",
          campusId: "campus-uuid-1",
          name: "Turing Auditorium",
          building: "CS",
          capacity: 250,
          isActive: true,
        },
      ]);

      const res = await GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.venues).toHaveLength(1);
      expect(data.venues[0].name).toBe("Turing Auditorium");
      expect(data.venues[0].is_active).toBe(true);
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
        campusId: "campus-uuid-1",
        name: "Seminar Hall B",
        building: "Academic Block 2",
        capacity: 150,
        address: "Block 2, 1st Floor",
        notes: null,
        isActive: true,
      };

      mockInsertReturning.mockResolvedValueOnce([newVenue]);

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
      expect(data.venue.is_active).toBe(true);
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
      mockUpdateReturning.mockResolvedValueOnce([]);

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
        campusId: "campus-uuid-1",
        name: "Turing Auditorium",
        building: "CS",
        capacity: 250,
        isActive: false,
      };

      mockUpdateReturning.mockResolvedValueOnce([updatedVenue]);

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
