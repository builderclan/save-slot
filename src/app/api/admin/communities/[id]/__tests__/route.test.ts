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
    selectDistinctOn: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            as: () => ({}),
          }),
        }),
      }),
    }),
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

describe("Admin Community [id] API (/api/admin/communities/[id])", () => {
  const mockParams = Promise.resolve({ id: "comm-uuid-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks unauthorized users on GET", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("staff"));
    const res = await GET(new Request("http://localhost"), { params: mockParams });
    expect(res.status).toBe(403);
  });

  it("returns 404 when community is not found on GET", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("admin"));
    let call = 0;
    mockSelect.mockImplementation(() => {
      call++;
      if (call === 1) {
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
      }
      return {
        from: () => ({
          innerJoin: () => ({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      };
    });

    const res = await GET(new Request("http://localhost"), { params: mockParams });
    expect(res.status).toBe(404);
  });

  it("returns community details including FICs on GET", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("admin"));
    let call = 0;
    mockSelect.mockImplementation(() => {
      call++;
      if (call === 1) {
        return {
          from: () => ({
            leftJoin: () => ({
              leftJoin: () => ({
                where: () => ({
                  limit: vi.fn().mockResolvedValue([
                    {
                      id: "comm-uuid-1",
                      name: "Coding Club",
                      slug: "coding-club",
                      code: "CC",
                      scope: "internal",
                      category: "Tech",
                      status: "approved",
                      memberCount: 10,
                      eventCount: 2,
                      createdAt: new Date("2026-10-01T00:00:00Z"),
                    },
                  ]),
                }),
              }),
            }),
          }),
        };
      }
      return {
        from: () => ({
          innerJoin: () => ({
            where: vi.fn().mockResolvedValue([
              { userId: "u-fic-1", fullName: "Prof. Arun Kumar" },
            ]),
          }),
        }),
      };
    });

    const res = await GET(new Request("http://localhost"), { params: mockParams });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.community.code).toBe("CC");
    expect(data.community.fic_names).toEqual(["Prof. Arun Kumar"]);
  });

  it("updates community scope, code, and FIC assignments on PATCH", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("admin"));
    mockSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: vi.fn().mockResolvedValue([
            { id: "comm-uuid-1", name: "Coding Club", slug: "coding-club", code: "CC" },
          ]),
        }),
      }),
    });

    const mockTxUpdate = vi.fn().mockReturnValue({
      set: () => ({
        where: () => ({
          returning: vi.fn().mockResolvedValue([
            {
              id: "comm-uuid-1",
              name: "Coding Club",
              slug: "coding-club",
              code: "CC2",
              scope: "external",
              category: "Tech",
              status: "approved",
              createdAt: new Date("2026-10-01T00:00:00Z"),
            },
          ]),
        }),
      }),
    });
    const mockTxSelect = vi.fn().mockReturnValue({
      from: () => ({
        where: () => ({
          for: vi.fn().mockResolvedValue([{ id: "comm-uuid-1" }]),
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    const mockTxDelete = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    const mockTxInsert = vi.fn().mockReturnValue({
      values: () => ({ onConflictDoUpdate: vi.fn().mockResolvedValue([]) }),
    });

    mockTransaction.mockImplementation(async (cb) =>
      cb({ select: mockTxSelect, update: mockTxUpdate, delete: mockTxDelete, insert: mockTxInsert })
    );

    const res = await PATCH(
      new Request("http://localhost/api/admin/communities/comm-uuid-1", {
        method: "PATCH",
        body: JSON.stringify({
          code: "CC2",
          scope: "external",
          ficUserIds: ["11111111-1111-4111-a111-111111111111"],
        }),
      }),
      { params: mockParams }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.community.code).toBe("CC2");
    expect(data.community.scope).toBe("external");
  });

  it("preserves current community lead when ficUserIds is updated without leadUserId", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("admin"));
    const leadId = "11111111-1111-4111-a111-111111111111";
    const ficId = "22222222-2222-4222-a222-222222222222";

    mockSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: vi.fn().mockResolvedValue([
            { id: "comm-uuid-1", name: "Coding Club", slug: "coding-club", code: "CC" },
          ]),
        }),
      }),
    });

    let txSelectCall = 0;
    const mockTxSelect = vi.fn().mockImplementation(() => {
      txSelectCall++;
      if (txSelectCall === 1) {
        return {
          from: () => ({
            where: () => ({
              for: vi.fn().mockResolvedValue([{ id: "comm-uuid-1" }]),
            }),
          }),
        };
      }
      return {
        from: () => ({
          where: () => ({
            limit: vi.fn().mockResolvedValue([{ userId: leadId }]),
          }),
        }),
      };
    });
    const mockTxDelete = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    const insertedValues: unknown[] = [];
    const mockTxInsert = vi.fn().mockImplementation(() => ({
      values: (val: unknown) => {
        insertedValues.push(val);
        return { onConflictDoUpdate: vi.fn().mockResolvedValue([]) };
      },
    }));

    mockTransaction.mockImplementation(async (cb) =>
      cb({ select: mockTxSelect, delete: mockTxDelete, insert: mockTxInsert })
    );

    const res = await PATCH(
      new Request("http://localhost/api/admin/communities/comm-uuid-1", {
        method: "PATCH",
        body: JSON.stringify({
          ficUserIds: [leadId, ficId],
        }),
      }),
      { params: mockParams }
    );
    expect(res.status).toBe(200);
    expect(insertedValues).toHaveLength(1);
    expect(insertedValues[0]).toEqual(
      expect.objectContaining({ userId: ficId, role: "fic" })
    );
  });

  it("prevents deletion when active events belong to the community", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("admin"));

    let selectCount = 0;
    const mockTxSelect = vi.fn().mockImplementation(() => {
      selectCount++;
      if (selectCount === 1) {
        return {
          from: () => ({
            where: () => ({
              for: vi.fn().mockResolvedValue([{ id: "comm-uuid-1" }]),
            }),
          }),
        };
      }
      return {
        from: () => ({
          where: vi.fn().mockResolvedValue([{ id: "ev-1" }]),
        }),
      };
    });

    mockTransaction.mockImplementation(async (cb) => cb({ select: mockTxSelect }));

    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }), {
      params: mockParams,
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("active or pending event(s)");
  });

  it("deletes community cleanly when no active events exist", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("admin"));

    let selectCount = 0;
    const mockTxSelect = vi.fn().mockImplementation(() => {
      selectCount++;
      if (selectCount === 1) {
        return {
          from: () => ({
            where: () => ({
              for: vi.fn().mockResolvedValue([{ id: "comm-uuid-1" }]),
            }),
          }),
        };
      }
      return {
        from: () => ({
          where: vi.fn().mockResolvedValue([]),
        }),
      };
    });
    const mockTxDelete = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    });

    mockTransaction.mockImplementation(async (cb) =>
      cb({ select: mockTxSelect, delete: mockTxDelete })
    );

    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }), {
      params: mockParams,
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockTxDelete).toHaveBeenCalledTimes(3);
  });
});
