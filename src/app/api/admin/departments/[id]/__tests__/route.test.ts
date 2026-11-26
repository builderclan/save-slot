import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH, DELETE } from "../route";
import type { AuthSession } from "@/server/auth";

vi.mock("@/server/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const {
  mockSelect,
  mockUpdate,
  mockUpdateReturning,
  mockDelete,
} = vi.hoisted(() => {
  const mockUpdateReturning = vi.fn();
  const mockUpdateWhere = vi.fn(() => ({ returning: mockUpdateReturning }));
  const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
  const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

  const mockDeleteReturning = vi.fn();
  const mockDeleteWhere = vi.fn(() => ({ returning: mockDeleteReturning }));
  const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }));

  return {
    mockSelect: vi.fn(),
    mockUpdate,
    mockUpdateReturning,
    mockDelete,
  };
});

vi.mock("@/lib/db", () => {
  const mockDbClient = {
    select: mockSelect,
    update: mockUpdate,
    delete: mockDelete,
  };
  return {
    db: mockDbClient,
    withDbRetry: (op: (client: typeof mockDbClient) => Promise<unknown>) => op(mockDbClient),
  };
});

import { getCurrentUser } from "@/server/auth";

const mockGetCurrentUser = vi.mocked(getCurrentUser);

function makeSession(role: AuthSession["profile"]["role"]): AuthSession {
  return {
    userId: `${role}-1`,
    email: `${role}@aisat.ac.in`,
    profile: { id: `${role}-1`, email: `${role}@aisat.ac.in`, full_name: role, role },
    isAdmin: role === "admin",
    isPrincipal: role === "principal" || role === "vice_principal",
    isVicePrincipal: role === "vice_principal",
    isHod: role === "hod",
    isActingHod: false,
    isTic: role === "tic",
    isStaff: role === "staff",
    isLead: role === "lead",
    leadCommunities: [],
    ticCommunities: [],
    hodDepartments: [],
  };
}

describe("Admin Department Details & Emergency Acting HOD API (/api/admin/departments/[id])", () => {
  const deptId = "11111111-1111-4111-a111-111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows Principal emergency Acting HOD toggle when actingHodUserId exists", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("principal"));
    mockSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: vi.fn().mockResolvedValue([
            { id: deptId, name: "CSE", code: "CSE", actingHodUserId: "u-acting-1", isActingHodActive: false },
          ]),
        }),
      }),
    });
    mockUpdateReturning.mockResolvedValueOnce([
      {
        id: deptId,
        name: "CSE",
        code: "CSE",
        actingHodUserId: "u-acting-1",
        isActingHodActive: true,
        isActive: true,
        createdAt: new Date("2026-10-01T00:00:00Z"),
      },
    ]);

    const res = await PATCH(
      new Request(`http://localhost/api/admin/departments/${deptId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActingHodActive: true }),
      }),
      { params: Promise.resolve({ id: deptId }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.department.is_acting_hod_active).toBe(true);
  });

  it("blocks Principal from renaming department code (IT Admin only)", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("principal"));
    mockSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: vi.fn().mockResolvedValue([
            { id: deptId, name: "CSE", code: "CSE", actingHodUserId: "u-acting-1" },
          ]),
        }),
      }),
    });

    const res = await PATCH(
      new Request(`http://localhost/api/admin/departments/${deptId}`, {
        method: "PATCH",
        body: JSON.stringify({ code: "CS" }),
      }),
      { params: Promise.resolve({ id: deptId }) }
    );
    expect(res.status).toBe(403);
  });

  it("rejects activating Acting HOD mode if no actingHodUserId is assigned", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("admin"));
    mockSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: vi.fn().mockResolvedValue([
            { id: deptId, name: "ECE", code: "ECE", actingHodUserId: null },
          ]),
        }),
      }),
    });

    const res = await PATCH(
      new Request(`http://localhost/api/admin/departments/${deptId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActingHodActive: true }),
      }),
      { params: Promise.resolve({ id: deptId }) }
    );
    expect(res.status).toBe(400);
  });

  it("blocks deletion when active events belong to the department", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("admin"));
    mockSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: vi.fn().mockResolvedValue([{ id: "ev-active-1" }]),
        }),
      }),
    });

    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ id: deptId }),
    });
    expect(res.status).toBe(400);
  });
});
