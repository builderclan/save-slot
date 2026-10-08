import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import type { QueryResult, QueryResultRow } from "pg";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
}));

import { getCurrentUser, type AuthSession } from "@/lib/auth";
import { query } from "@/lib/db";

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockQuery = vi.mocked(query);

function mockDbResult<T extends QueryResultRow>(rows: T[]): QueryResult<T> {
  return {
    rows,
    command: "SELECT",
    rowCount: rows.length,
    oid: 0,
    fields: [],
  };
}

describe("Events Public & Authenticated API (GET /api/events)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches published events by default for public users", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    mockQuery.mockResolvedValueOnce(
      mockDbResult([
        {
          id: "event-1",
          title: "Orientation Day",
          status: "published",
        },
      ])
    );

    const req = new Request("http://localhost/api/events");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.events).toHaveLength(1);
    expect(data.events[0].title).toBe("Orientation Day");

    // Verify first parameter is 'published'
    const queryParams = mockQuery.mock.calls[0][1] as unknown[];
    expect(queryParams[0]).toBe("published");
  });

  it("downgrades unprivileged users requesting pending events to published", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    mockQuery.mockResolvedValueOnce(mockDbResult([]));

    const req = new Request("http://localhost/api/events?status=pending");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const queryParams = mockQuery.mock.calls[0][1] as unknown[];
    expect(queryParams[0]).toBe("published");
  });

  it("allows administrators to query non-published events (e.g. pending)", async () => {
    const adminSession: AuthSession = {
      userId: "admin-1",
      email: "admin@campus.edu",
      profile: {
        id: "admin-1",
        email: "admin@campus.edu",
        full_name: "Admin User",
        role: "admin",
      },
      isAdmin: true,
      isPrincipal: false,
      isVicePrincipal: false,
      isLead: false,
      leadCommunities: [],
    };

    mockGetCurrentUser.mockResolvedValue(adminSession);
    mockQuery.mockResolvedValueOnce(
      mockDbResult([
        {
          id: "event-pending-1",
          title: "Hackathon Proposal",
          status: "pending",
        },
      ])
    );

    const req = new Request("http://localhost/api/events?status=pending");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.events[0].status).toBe("pending");

    const queryParams = mockQuery.mock.calls[0][1] as unknown[];
    expect(queryParams[0]).toBe("pending");
  });

  it("applies category, community, and search filters accurately in SQL", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    mockQuery.mockResolvedValueOnce(mockDbResult([]));

    const req = new Request(
      "http://localhost/api/events?category=Tech&community=coding-club&search=hack"
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const sql = mockQuery.mock.calls[0][0] as string;
    const params = mockQuery.mock.calls[0][1] as unknown[];

    expect(sql).toContain("AND e.category = $2");
    expect(sql).toContain("AND c.slug = $3");
    expect(sql).toContain("ILIKE");

    expect(params).toContain("Tech");
    expect(params).toContain("coding-club");
    expect(params).toContain("%hack%");
  });

  it("clamps pagination limits safely", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    mockQuery.mockResolvedValueOnce(mockDbResult([]));

    const req = new Request("http://localhost/api/events?limit=9999&offset=10");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const params = mockQuery.mock.calls[0][1] as unknown[];
    // Clamped max limit is 300
    expect(params).toContain(300);
    expect(params).toContain(10);
  });
});
