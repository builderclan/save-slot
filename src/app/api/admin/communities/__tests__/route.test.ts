import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";
import type { AuthSession } from "@/server/auth";

vi.mock("@/server/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const {
  mockSelect,
  mockInsert,
  mockTransaction,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
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
    insert: mockInsert,
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

describe("Admin Communities API (/api/admin/communities)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("denies non-admin/non-principal users on GET", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("lead"));
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("lists communities with code, scope, lead, and FICs on GET", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("admin"));

    let selectCount = 0;
    mockSelect.mockImplementation(() => {
      selectCount++;
      if (selectCount === 1) {
        return {
          from: () => ({
            leftJoin: () => ({
              leftJoin: () => ({
                orderBy: vi.fn().mockResolvedValue([
                  {
                    id: "comm-1",
                    name: "IEEE Student Branch",
                    slug: "ieee",
                    code: "IEEE",
                    scope: "external",
                    category: "Tech",
                    status: "approved",
                    leadId: "u-lead",
                    leadName: "Nikhil Thomas",
                    leadEmail: "lead.ieee@aisat.ac.in",
                    memberCount: 12,
                    eventCount: 2,
                    createdAt: new Date("2026-10-01T00:00:00Z"),
                  },
                ]),
              }),
            }),
          }),
        };
      }
      return {
        from: () => ({
          innerJoin: () => ({
            where: vi.fn().mockResolvedValue([
              { communityId: "comm-1", userId: "u-fic-1", fullName: "Prof. Deepa George" },
            ]),
          }),
        }),
      };
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.communities).toHaveLength(1);
    expect(data.communities[0].code).toBe("IEEE");
    expect(data.communities[0].scope).toBe("external");
    expect(data.communities[0].fic_ids).toEqual(["u-fic-1"]);
    expect(data.communities[0].fic_names).toEqual(["Prof. Deepa George"]);
  });

  it("rejects assigned leadUserId that is not a Lead or Staff account", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("admin"));
    mockSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const res = await POST(
      new Request("http://localhost/api/admin/communities", {
        method: "POST",
        body: JSON.stringify({
          name: "Robotics Club",
          category: "Tech",
          scope: "internal",
          leadUserId: "11111111-1111-4111-a111-111111111111",
        }),
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Lead or Staff");
  });

  it("creates community with scope, code, lead, and multi-FIC links on POST", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeSession("admin"));

    const mockTxInsert = vi.fn().mockImplementation(() => ({
      values: () => ({
        returning: vi.fn().mockResolvedValue([
          {
            id: "comm-new",
            name: "NSS Unit",
            slug: "nss-unit",
            code: "NSS",
            scope: "external",
            category: "Social",
            status: "approved",
            createdAt: new Date("2026-10-01T00:00:00Z"),
          },
        ]),
        onConflictDoUpdate: vi.fn().mockResolvedValue([]),
      }),
    }));

    mockTransaction.mockImplementation(async (cb) => cb({ insert: mockTxInsert }));

    const res = await POST(
      new Request("http://localhost/api/admin/communities", {
        method: "POST",
        body: JSON.stringify({
          name: "NSS Unit",
          code: "nss",
          scope: "external",
          category: "Social",
          ficUserIds: ["22222222-2222-4222-a222-222222222222"],
        }),
      })
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.community.code).toBe("NSS");
    expect(data.community.scope).toBe("external");
    expect(mockTxInsert).toHaveBeenCalledTimes(2);
  });
});
