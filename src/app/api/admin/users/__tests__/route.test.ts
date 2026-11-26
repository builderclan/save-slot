import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";
import type { AuthSession } from "@/server/auth";

vi.mock("@/server/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const {
  mockSelect,
  mockTransaction,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock("@/lib/db", () => {
  const mockDbClient = {
    select: mockSelect,
    transaction: mockTransaction,
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
    isFic: role === "fic",
    isStaff: role === "staff",
    isLead: role === "lead",
    leadCommunities: [],
    ficCommunities: [],
    hodDepartments: [],
  };
}

describe("Admin Users API (/api/admin/users)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin/non-principal users on GET", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("staff"));
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns formatted users with department and community joins on GET", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("admin"));

    let call = 0;
    mockSelect.mockImplementation(() => {
      call++;
      if (call === 1) {
        return {
          from: () => ({
            innerJoin: () => ({
              groupBy: () => ({
                as: () => ({}),
              }),
            }),
          }),
        };
      }
      return {
        from: () => ({
          leftJoin: () => ({
            leftJoin: () => ({
              orderBy: vi.fn().mockResolvedValue([
                {
                  id: "u-hod-1",
                  email: "hod.cse@aisat.ac.in",
                  fullName: "Dr. Anitha S.",
                  role: "hod",
                  designation: "Professor & HOD, CSE",
                  departmentId: "dept-cse",
                  departmentName: "Computer Science",
                  departmentCode: "CSE",
                  isActive: true,
                  createdAt: new Date("2026-10-01T00:00:00Z"),
                },
              ]),
            }),
          }),
        }),
      };
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.users).toHaveLength(1);
    expect(data.users[0].role).toBe("hod");
    expect(data.users[0].department_code).toBe("CSE");
  });

  it("denies Principal from provisioning users on POST (IT Admin only)", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("principal"));
    const res = await POST(
      new Request("http://localhost/api/admin/users", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(403);
  });

  it("provisions faculty user with department and FIC membership on POST", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("admin"));
    mockSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const mockTxExecute = vi.fn().mockResolvedValue([]);
    const mockTxInsert = vi.fn().mockImplementation(() => ({
      values: () => ({
        returning: vi.fn().mockResolvedValue([
          {
            id: "u-new-1",
            email: "arun.cse@aisat.ac.in",
            fullName: "Prof. Arun Kumar",
            role: "staff",
            designation: "Assistant Professor, CSE",
            departmentId: "11111111-1111-4111-a111-111111111111",
            isActive: true,
            createdAt: new Date("2026-10-01T00:00:00Z"),
          },
        ]),
        onConflictDoUpdate: vi.fn().mockResolvedValue([]),
      }),
    }));

    mockTransaction.mockImplementation(async (cb) =>
      cb({ execute: mockTxExecute, insert: mockTxInsert })
    );

    const res = await POST(
      new Request("http://localhost/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          fullName: "Prof. Arun Kumar",
          email: "arun.cse@aisat.ac.in",
          password: "password123",
          role: "staff",
          designation: "Assistant Professor, CSE",
          departmentId: "11111111-1111-4111-a111-111111111111",
          communityId: "22222222-2222-4222-a222-222222222222",
          communityMemberRole: "fic",
        }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.role).toBe("staff");
    expect(mockTxExecute).toHaveBeenCalledTimes(2);
    expect(mockTxInsert).toHaveBeenCalledTimes(2);
  });
});
