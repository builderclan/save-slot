import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";
import type { AuthSession } from "@/server/auth";

vi.mock("@/server/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const {
  mockSelect,
  mockSelectFrom,
  mockSelectLeftJoin,
  mockSelectOrderBy,
  mockInsert,
  mockInsertValues,
  mockInsertReturning,
} = vi.hoisted(() => {
  const mockSelectOrderBy = vi.fn();
  const mockSelectLeftJoin = vi.fn();
  const mockSelectFrom = vi.fn();
  const mockSelect = vi.fn();

  const mockInsertReturning = vi.fn();
  const mockInsertValues = vi.fn();
  const mockInsert = vi.fn();

  mockSelectLeftJoin.mockReturnValue({
    leftJoin: mockSelectLeftJoin,
    orderBy: mockSelectOrderBy,
  });
  mockSelectFrom.mockReturnValue({ leftJoin: mockSelectLeftJoin });
  mockSelect.mockReturnValue({ from: mockSelectFrom });

  mockInsertValues.mockReturnValue({ returning: mockInsertReturning });
  mockInsert.mockReturnValue({ values: mockInsertValues });

  return {
    mockSelect,
    mockSelectFrom,
    mockSelectLeftJoin,
    mockSelectOrderBy,
    mockInsert,
    mockInsertValues,
    mockInsertReturning,
  };
});

vi.mock("@/lib/db", () => {
  const mockDbClient = {
    select: mockSelect,
    insert: mockInsert,
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

describe("Admin Departments API (/api/admin/departments)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectLeftJoin.mockReturnValue({
      leftJoin: mockSelectLeftJoin,
      orderBy: mockSelectOrderBy,
    });
    mockSelectFrom.mockReturnValue({ leftJoin: mockSelectLeftJoin });
    mockSelect.mockReturnValue({ from: mockSelectFrom });
    mockInsertValues.mockReturnValue({ returning: mockInsertReturning });
    mockInsert.mockReturnValue({ values: mockInsertValues });
  });

  it("denies non-admin/non-principal access on GET", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("staff"));
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns formatted departments with HOD and Acting HOD joins on GET", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("admin"));
    mockSelectOrderBy.mockResolvedValueOnce([
      {
        id: "dept-cse",
        name: "Computer Science & Engineering",
        code: "CSE",
        hodUserId: "u-hod",
        actingHodUserId: "u-acting",
        isActingHodActive: true,
        actingHodToggledBy: "admin-1",
        actingHodToggledAt: new Date("2026-10-01T10:00:00Z"),
        isActive: true,
        createdAt: new Date("2026-09-01T00:00:00Z"),
        hod: { id: "u-hod", fullName: "Dr. Anitha S.", email: "hod.cse@aisat.ac.in" },
        actingHod: { id: "u-acting", fullName: "Prof. Arun Kumar", email: "arun.cse@aisat.ac.in" },
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.departments).toHaveLength(1);
    expect(data.departments[0].code).toBe("CSE");
    expect(data.departments[0].is_acting_hod_active).toBe(true);
    expect(data.departments[0].acting_hod?.full_name).toBe("Prof. Arun Kumar");
  });

  it("blocks Principal from creating departments (IT Admin only)", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("principal"));
    const res = await POST(
      new Request("http://localhost/api/admin/departments", {
        method: "POST",
        body: JSON.stringify({ name: "Civil Engineering", code: "CE" }),
      })
    );
    expect(res.status).toBe(403);
  });

  it("creates department and uppercases code", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("admin"));
    mockInsertReturning.mockResolvedValueOnce([
      {
        id: "dept-ce",
        name: "Civil Engineering",
        code: "CE",
        hodUserId: null,
        actingHodUserId: null,
        isActingHodActive: false,
        actingHodToggledBy: null,
        actingHodToggledAt: null,
        isActive: true,
        createdAt: new Date("2026-10-01T00:00:00Z"),
      },
    ]);

    const res = await POST(
      new Request("http://localhost/api/admin/departments", {
        method: "POST",
        body: JSON.stringify({ name: "Civil Engineering", code: "ce" }),
      })
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.department.code).toBe("CE");
  });
});
