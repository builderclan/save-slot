import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH } from "../route";
import type { AuthSession } from "@/server/auth";

vi.mock("@/server/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const {
  mockSelect,
  mockSelectFrom,
  mockSelectWhere,
  mockSelectLimit,
  mockUpdate,
  mockUpdateSet,
  mockUpdateWhere,
  mockUpdateReturning,
} = vi.hoisted(() => {
  const mockSelectLimit = vi.fn();
  const mockSelectWhere = vi.fn();
  const mockSelectFrom = vi.fn();
  const mockSelect = vi.fn();

  const mockUpdateReturning = vi.fn();
  const mockUpdateWhere = vi.fn();
  const mockUpdateSet = vi.fn();
  const mockUpdate = vi.fn();

  mockSelectWhere.mockReturnValue({ limit: mockSelectLimit });
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockSelect.mockReturnValue({ from: mockSelectFrom });

  mockUpdateWhere.mockReturnValue({ returning: mockUpdateReturning });
  mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
  mockUpdate.mockReturnValue({ set: mockUpdateSet });

  return {
    mockSelect,
    mockSelectFrom,
    mockSelectWhere,
    mockSelectLimit,
    mockUpdate,
    mockUpdateSet,
    mockUpdateWhere,
    mockUpdateReturning,
  };
});

vi.mock("@/lib/db", () => {
  const mockDbClient = {
    select: mockSelect,
    update: mockUpdate,
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

describe("Admin College Settings API (/api/admin/settings)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectWhere.mockReturnValue({ limit: mockSelectLimit });
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
    mockSelect.mockReturnValue({ from: mockSelectFrom });
    mockUpdateWhere.mockReturnValue({ returning: mockUpdateReturning });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdate.mockReturnValue({ set: mockUpdateSet });
  });

  it("blocks non-admin/non-principal users on GET", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("lead"));
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns college identity settings on GET", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("admin"));
    mockSelectLimit.mockResolvedValueOnce([
      {
        id: 1,
        collegeName: "AISAT",
        shortCode: "AISAT",
        letterheadSubtitle: "Kalamassery, Kochi",
        logoUrl: null,
        academicYearStartMonth: 7,
        timezone: "Asia/Kolkata",
        updatedAt: new Date("2026-10-01T00:00:00Z"),
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.settings.short_code).toBe("AISAT");
    expect(data.settings.academic_year_start_month).toBe(7);
  });

  it("blocks Principal from mutating settings on PATCH (IT Admin only)", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("principal"));
    const res = await PATCH(
      new Request("http://localhost/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ collegeName: "Updated" }),
      })
    );
    expect(res.status).toBe(403);
  });

  it("updates settings cleanly on PATCH as IT Admin", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("admin"));
    mockUpdateReturning.mockResolvedValueOnce([
      {
        id: 1,
        collegeName: "AISAT Engineering",
        shortCode: "AISAT",
        letterheadSubtitle: "Autonomous College",
        logoUrl: null,
        academicYearStartMonth: 7,
        timezone: "Asia/Kolkata",
        updatedAt: new Date("2026-10-02T00:00:00Z"),
      },
    ]);

    const res = await PATCH(
      new Request("http://localhost/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          collegeName: "AISAT Engineering",
          letterheadSubtitle: "Autonomous College",
        }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.settings.college_name).toBe("AISAT Engineering");
  });
});
