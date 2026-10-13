import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "../route";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const {
  mockDelete,
  mockDeleteWhere,
  mockDeleteReturning,
} = vi.hoisted(() => {
  const mockDeleteReturning = vi.fn();
  const mockDeleteWhere = vi.fn();
  const mockDelete = vi.fn();

  mockDeleteWhere.mockReturnValue({ returning: mockDeleteReturning });
  mockDelete.mockReturnValue({ where: mockDeleteWhere });

  return {
    mockDelete,
    mockDeleteWhere,
    mockDeleteReturning,
  };
});

vi.mock("@/lib/db", () => {
  const mockDbClient = {
    delete: mockDelete,
  };

  return {
    db: mockDbClient,
    withDbRetry: (op: (client: typeof mockDbClient) => Promise<unknown>) => op(mockDbClient),
  };
});

import { getCurrentUser, type AuthSession } from "@/lib/auth";

const mockGetCurrentUser = vi.mocked(getCurrentUser);

describe("DELETE /api/admin/events/[id]", () => {
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

  const mockParams = Promise.resolve({ id: "event-uuid-1" });

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteWhere.mockReturnValue({ returning: mockDeleteReturning });
    mockDelete.mockReturnValue({ where: mockDeleteWhere });
  });

  it("should return 403 when session is missing", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);

    const req = new Request("http://localhost/api/admin/events/event-uuid-1", {
      method: "DELETE",
    });

    const res = await DELETE(req, { params: mockParams });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized admin access");
  });

  it("should return 403 when user is not an admin", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(nonAdminSession);

    const req = new Request("http://localhost/api/admin/events/event-uuid-1", {
      method: "DELETE",
    });

    const res = await DELETE(req, { params: mockParams });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized admin access");
  });

  it("should return 404 when the target event does not exist", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(adminSession);
    mockDeleteReturning.mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/admin/events/event-uuid-1", {
      method: "DELETE",
    });

    const res = await DELETE(req, { params: mockParams });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Event not found");
  });

  it("should return 200 with deletedId on successful deletion", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(adminSession);
    mockDeleteReturning.mockResolvedValueOnce([{ id: "event-uuid-1" }]);

    const req = new Request("http://localhost/api/admin/events/event-uuid-1", {
      method: "DELETE",
    });

    const res = await DELETE(req, { params: mockParams });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.deletedId).toBe("event-uuid-1");
  });

  it("should return 500 when database deletion fails", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(adminSession);
    mockDeleteReturning.mockRejectedValueOnce(new Error("Database connection lost"));

    const req = new Request("http://localhost/api/admin/events/event-uuid-1", {
      method: "DELETE",
    });

    const res = await DELETE(req, { params: mockParams });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Database connection lost");
  });
});
