import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH, DELETE } from "../route";
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
    userId: "admin-1",
    email: `${role}@aisat.ac.in`,
    profile: { id: "admin-1", email: `${role}@aisat.ac.in`, full_name: role, role },
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

describe("Admin User Details API (/api/admin/users/[id])", () => {
  const mockParams = Promise.resolve({ id: "user-target-id" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks non-admin requests", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("principal"));
    const res = await GET(new Request("http://localhost"), { params: mockParams });
    expect(res.status).toBe(403);
  });

  it("returns 404 when user does not exist on GET", async () => {
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
              where: () => ({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      };
    });

    const res = await GET(new Request("http://localhost"), { params: mockParams });
    expect(res.status).toBe(404);
  });

  it("updates user profile and active status on PATCH", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("admin"));
    mockSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: vi.fn().mockResolvedValue([
            { id: "user-target-id", role: "staff", email: "arun@aisat.ac.in" },
          ]),
        }),
      }),
    });

    const mockTxUpdate = vi.fn().mockReturnValue({
      set: () => ({ where: vi.fn().mockResolvedValue([]) }),
    });
    mockTransaction.mockImplementation(async (cb) =>
      cb({
        update: mockTxUpdate,
        transaction: () => Promise.resolve([]),
        delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
        insert: vi.fn(),
      })
    );

    const res = await PATCH(
      new Request("http://localhost/api/admin/users/user-target-id", {
        method: "PATCH",
        body: JSON.stringify({
          fullName: "Dr. Arun Kumar",
          role: "hod",
          isActive: true,
        }),
      }),
      { params: mockParams }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockTxUpdate).toHaveBeenCalledTimes(1);
  });

  it("prevents deleting own active administrator account", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("admin"));
    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ id: "admin-1" }),
    });
    expect(res.status).toBe(400);
  });

  it("deletes target user across communityMembers, users, and auth tables", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("admin"));
    mockSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: vi.fn().mockResolvedValue([{ id: "user-target-id", email: "old@aisat.ac.in" }]),
        }),
      }),
    });

    const mockTxDelete = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    });
    const mockTxExecute = vi.fn().mockResolvedValue([]);
    mockTransaction.mockImplementation(async (cb) =>
      cb({ delete: mockTxDelete, execute: mockTxExecute })
    );

    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }), {
      params: mockParams,
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockTxDelete).toHaveBeenCalledTimes(2);
    expect(mockTxExecute).toHaveBeenCalledTimes(2);
  });
});
