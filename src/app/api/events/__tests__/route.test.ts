import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import type { DrizzleEventRow } from "@/db/adapters";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const dialect = new PgDialect();

const mockOffset = vi.fn();
const mockLimit = vi.fn();
const mockOrderBy = vi.fn();
const mockWhere = vi.fn();
const mockLeftJoin = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();

function setupQueryChain(defaultRows: DrizzleEventRow[] = []) {
  mockOffset.mockResolvedValue(defaultRows);
  mockLimit.mockReturnValue({ offset: mockOffset });
  mockOrderBy.mockReturnValue({ limit: mockLimit });
  mockWhere.mockReturnValue({ orderBy: mockOrderBy });
  mockLeftJoin.mockReturnValue({ leftJoin: mockLeftJoin, where: mockWhere });
  mockFrom.mockReturnValue({ leftJoin: mockLeftJoin });
  mockSelect.mockReturnValue({ from: mockFrom });
}

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
  withDbRetry: (
    op: (client: {
      select: (...args: unknown[]) => unknown;
    }) => Promise<unknown>,
  ) =>
    op({
      select: (...args: unknown[]) => mockSelect(...args),
    }),
}));

import { getCurrentUser, type AuthSession } from "@/lib/auth";

const mockGetCurrentUser = vi.mocked(getCurrentUser);

describe("Events Public & Authenticated API (GET /api/events v1.0.0)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupQueryChain();
  });

  it("fetches published events by default for public users with direct joins", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const mockRow: DrizzleEventRow = {
      id: "event-1",
      originType: "community",
      communityId: "comm-1",
      title: "Orientation Day",
      slug: "orientation-day",
      description: "Welcome to campus",
      category: "Social",
      tags: ["welcome"],
      startTime: new Date("2026-10-15T10:00:00Z"),
      endTime: new Date("2026-10-15T12:00:00Z"),
      locationName: "Campus Green",
      status: "published",
      community: {
        id: "comm-1",
        name: "Student Life",
        slug: "student-life",
        code: "SL",
        scope: "internal",
        category: "General",
      },
      venue: {
        id: "venue-1",
        name: "Main Auditorium",
        building: "Hall A",
      },
    };
    mockOffset.mockResolvedValueOnce([mockRow]);

    const req = new Request("http://localhost/api/events");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.events).toHaveLength(1);
    expect(data.events[0].title).toBe("Orientation Day");
    expect(data.events[0].community?.name).toBe("Student Life");
    expect(data.events[0].venue?.name).toBe("Main Auditorium");

    expect(mockSelect).toHaveBeenCalledTimes(1);
    expect(mockLeftJoin).toHaveBeenCalledTimes(5);
    expect(mockLimit).toHaveBeenCalledWith(150);
    expect(mockOffset).toHaveBeenCalledWith(0);

    const whereQuery = dialect.sqlToQuery(mockWhere.mock.calls[0][0] as SQL);
    expect(whereQuery.params).toContain("published");
  });

  it("downgrades unprivileged users requesting pending events to published", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    mockOffset.mockResolvedValueOnce([]);

    const req = new Request(
      "http://localhost/api/events?status=pending_executive",
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockSelect).toHaveBeenCalledTimes(1);
    expect(mockWhere).toHaveBeenCalled();

    const whereQuery = dialect.sqlToQuery(mockWhere.mock.calls[0][0] as SQL);
    expect(whereQuery.params).toContain("published");
    expect(whereQuery.params).not.toContain("pending_executive");
  });

  it("allows administrators to query non-published events (e.g. pending_executive)", async () => {
    const adminSession: AuthSession = {
      userId: "admin-1",
      email: "admin@aisat.ac.in",
      profile: {
        id: "admin-1",
        email: "admin@aisat.ac.in",
        full_name: "Admin User",
        role: "admin",
      },
      isAdmin: true,
      isPrincipal: false,
      isVicePrincipal: false,
      isHod: false,
      isActingHod: false,
      isFic: false,
      isStaff: false,
      isLead: false,
      leadCommunities: [],
      ficCommunities: [],
      hodDepartments: [],
    };

    mockGetCurrentUser.mockResolvedValue(adminSession);
    const mockRow: DrizzleEventRow = {
      id: "event-pending-1",
      originType: "community",
      communityId: "comm-1",
      title: "Hackathon Proposal",
      slug: "hackathon-proposal",
      description: "New hackathon",
      category: "Tech",
      startTime: new Date("2026-10-20T10:00:00Z"),
      endTime: new Date("2026-10-20T18:00:00Z"),
      locationName: "Tech Hub",
      status: "pending_executive",
    };
    mockOffset.mockResolvedValueOnce([mockRow]);

    const req = new Request(
      "http://localhost/api/events?status=pending_executive",
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.events[0].status).toBe("pending_executive");

    const whereQuery = dialect.sqlToQuery(mockWhere.mock.calls[0][0] as SQL);
    expect(whereQuery.params).toContain("pending_executive");
  });

  it("allows administrators and principals to query all statuses without filtering status = 'all'", async () => {
    const adminSession: AuthSession = {
      userId: "admin-1",
      email: "admin@aisat.ac.in",
      profile: {
        id: "admin-1",
        email: "admin@aisat.ac.in",
        full_name: "Admin User",
        role: "admin",
      },
      isAdmin: true,
      isPrincipal: false,
      isVicePrincipal: false,
      isHod: false,
      isActingHod: false,
      isFic: false,
      isStaff: false,
      isLead: false,
      leadCommunities: [],
      ficCommunities: [],
      hodDepartments: [],
    };

    mockGetCurrentUser.mockResolvedValue(adminSession);
    const mockRow: DrizzleEventRow = {
      id: "event-all-1",
      originType: "community",
      communityId: "comm-1",
      title: "Published Event",
      slug: "published-event",
      description: "Live event",
      category: "Tech",
      startTime: new Date("2026-10-20T10:00:00Z"),
      endTime: new Date("2026-10-20T18:00:00Z"),
      locationName: "Main Hall",
      status: "published",
    };
    mockOffset.mockResolvedValueOnce([mockRow]);

    const req = new Request("http://localhost/api/events?status=all&limit=200");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.events).toHaveLength(1);
    expect(data.events[0].id).toBe("event-all-1");
    expect(mockWhere).toHaveBeenCalledWith(undefined);
  });

  it("applies category, community, and search filters directly in SQL joins", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    mockOffset.mockResolvedValueOnce([]);

    const req = new Request(
      "http://localhost/api/events?category=Tech&community=coding-club&search=hack",
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockWhere).toHaveBeenCalled();

    const whereQuery = dialect.sqlToQuery(mockWhere.mock.calls[0][0] as SQL);
    expect(whereQuery.sql).toContain('"events"."category" = $');
    expect(whereQuery.sql).toContain('"communities"."slug" = $');
    expect(whereQuery.sql).toContain("ilike");
    expect(whereQuery.params).toContain("Tech");
    expect(whereQuery.params).toContain("coding-club");
    expect(whereQuery.params).toContain("%hack%");
  });

  it("clamps pagination limits safely", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    mockOffset.mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/events?limit=9999&offset=10");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockLimit).toHaveBeenCalledWith(300);
    expect(mockOffset).toHaveBeenCalledWith(10);
  });
});
