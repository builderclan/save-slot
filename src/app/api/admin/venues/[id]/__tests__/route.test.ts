import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH, DELETE } from "../route";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const {
  mockSelect,
  mockSelectFrom,
  mockSelectWhere,
  mockUpdate,
  mockUpdateSet,
  mockUpdateWhere,
  mockUpdateReturning,
  mockDelete,
  mockDeleteWhere,
  mockDeleteReturning,
  mockTransaction,
} = vi.hoisted(() => {
  const mockSelectWhere = vi.fn();
  const mockSelectFrom = vi.fn();
  const mockSelect = vi.fn();

  const mockUpdateReturning = vi.fn();
  const mockUpdateWhere = vi.fn();
  const mockUpdateSet = vi.fn();
  const mockUpdate = vi.fn();

  const mockDeleteReturning = vi.fn();
  const mockDeleteWhere = vi.fn();
  const mockDelete = vi.fn();

  const mockTransaction = vi.fn();

  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockSelect.mockReturnValue({ from: mockSelectFrom });

  mockUpdateWhere.mockReturnValue({ returning: mockUpdateReturning });
  mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
  mockUpdate.mockReturnValue({ set: mockUpdateSet });

  mockDeleteWhere.mockReturnValue({ returning: mockDeleteReturning });
  mockDelete.mockReturnValue({ where: mockDeleteWhere });

  return {
    mockSelect,
    mockSelectFrom,
    mockSelectWhere,
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
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
    mockSelect.mockReturnValue({ from: mockSelectFrom });
    mockUpdateWhere.mockReturnValue({ returning: mockUpdateReturning });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdate.mockReturnValue({ set: mockUpdateSet });
    mockDeleteWhere.mockReturnValue({ returning: mockDeleteReturning });
    mockDelete.mockReturnValue({ where: mockDeleteWhere });
    mockTransaction.mockImplementation(async (callback) => {
      const tx = {
        update: mockUpdate,
        delete: mockDelete,
      };
      return callback(tx);
    });
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

    it("should return 400 when no fields to update are provided", async () => {
      mockGetCurrentUser.mockResolvedValue(adminSession);
      const req = new Request("http://localhost/api/admin/venues/venue-uuid-1", {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      const res = await PATCH(req, { params: mockParams });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("No fields to update");
    });

    it("should return 404 when venue does not exist", async () => {
      mockGetCurrentUser.mockResolvedValue(adminSession);
      mockUpdateReturning.mockResolvedValueOnce([]);

      const req = new Request("http://localhost/api/admin/venues/venue-uuid-1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Non-existent Venue" }),
      });
      const res = await PATCH(req, { params: mockParams });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Venue not found");
    });

    it("should update venue details successfully", async () => {
      mockGetCurrentUser.mockResolvedValue(adminSession);
      mockUpdateReturning.mockResolvedValueOnce([
        {
          id: "venue-uuid-1",
          campusId: "campus-uuid-1",
          name: "Updated Lab",
          building: "Main Wing",
          capacity: 150,
          isActive: true,
        },
      ]);

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
      expect(data.venue.is_active).toBe(true);
    });
  });

  describe("DELETE /api/admin/venues/[id]", () => {
    it("should prevent deletion when upcoming events exist with 400", async () => {
      mockGetCurrentUser.mockResolvedValue(adminSession);
      mockSelectWhere.mockResolvedValueOnce([
        { id: "event-1", title: "Hackathon" },
        { id: "event-2", title: "Seminar" },
      ]);

      const req = new Request("http://localhost/api/admin/venues/venue-uuid-1", {
        method: "DELETE",
      });

      const res = await DELETE(req, { params: mockParams });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("upcoming or pending event(s) are scheduled here");
    });

    it("should return 404 when venue to delete does not exist", async () => {
      mockGetCurrentUser.mockResolvedValue(adminSession);
      // No active events scheduled
      mockSelectWhere.mockResolvedValueOnce([]);
      // Update detachment (historical events)
      mockUpdateWhere.mockReturnValue({ returning: vi.fn() });
      // Delete returns empty
      mockDeleteReturning.mockResolvedValueOnce([]);

      const req = new Request("http://localhost/api/admin/venues/venue-uuid-1", {
        method: "DELETE",
      });

      const res = await DELETE(req, { params: mockParams });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Venue not found");
    });

    it("should allow safe deletion when no active events are scheduled", async () => {
      mockGetCurrentUser.mockResolvedValue(adminSession);
      // 1. Check active events (0)
      mockSelectWhere.mockResolvedValueOnce([]);
      // 2. Transaction: detach events, then delete venue
      mockUpdateWhere.mockReturnValue({ returning: vi.fn() });
      mockDeleteReturning.mockResolvedValueOnce([{ id: "venue-uuid-1" }]);

      const req = new Request("http://localhost/api/admin/venues/venue-uuid-1", {
        method: "DELETE",
      });

      const res = await DELETE(req, { params: mockParams });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.deletedId).toBe("venue-uuid-1");
      expect(mockTransaction).toHaveBeenCalledTimes(1);
    });
  });
});
