import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const {
  mockFindMany,
  mockSelect,
  mockSelectFrom,
  mockSelectLimit,
  mockInsert,
  mockInsertReturning,
} = vi.hoisted(() => {
  const mockFindMany = vi.fn();
  const mockSelectLimit = vi.fn();
  const mockSelectWhere = vi.fn();
  const mockSelectFrom = vi.fn();
  const mockSelect = vi.fn();

  const mockInsertReturning = vi.fn();
  const mockInsertValues = vi.fn();
  const mockInsert = vi.fn();

  mockSelectWhere.mockReturnValue({ limit: mockSelectLimit });
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockSelect.mockReturnValue({ from: mockSelectFrom });

  mockInsertValues.mockReturnValue({ returning: mockInsertReturning });
  mockInsert.mockReturnValue({ values: mockInsertValues });

  return {
    mockFindMany,
    mockSelect,
    mockSelectFrom,
    mockSelectLimit,
    mockInsert,
    mockInsertReturning,
  };
});

vi.mock("@/lib/db", () => {
  const mockDbClient = {
    query: {
      events: {
        findMany: mockFindMany,
      },
    },
    select: mockSelect,
    insert: mockInsert,
  };

  return {
    db: mockDbClient,
    withDbRetry: (op: (client: typeof mockDbClient) => Promise<unknown>) => op(mockDbClient),
  };
});

vi.mock("@/lib/conflicts/engine", () => ({
  checkEventConflicts: vi.fn(),
}));

import { getCurrentUser, type AuthSession } from "@/lib/auth";
import { checkEventConflicts } from "@/lib/conflicts/engine";

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockCheckEventConflicts = vi.mocked(checkEventConflicts);

describe("Lead Events API - GET /api/lead/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ from: mockSelectFrom });
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);

    const res = await GET();
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized access");
  });

  it("returns 401 when user is a student without lead or admin role", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      userId: "u-student",
      isLead: false,
      isAdmin: false,
      isPrincipal: false,
      leadCommunities: [],
    } as unknown as AuthSession);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns empty events array immediately if lead has no assigned communities", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      userId: "u-lead",
      isLead: true,
      isAdmin: false,
      isPrincipal: false,
      leadCommunities: [],
    } as unknown as AuthSession);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.events).toEqual([]);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("fetches and formats events for authorized lead communities", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      userId: "u-lead",
      isLead: true,
      isAdmin: false,
      isPrincipal: false,
      leadCommunities: [
        { id: "comm-1", name: "Dev Club", slug: "dev-club", category: "Tech", campus_id: "campus-1" },
      ],
    } as unknown as AuthSession);

    mockFindMany.mockResolvedValueOnce([
      {
        id: "ev-1",
        campusId: "campus-1",
        communityId: "comm-1",
        venueId: "v-1",
        title: "Hackathon 2026",
        slug: "hackathon-2026",
        description: "Annual hackathon",
        category: "Tech",
        startTime: new Date("2026-11-01T09:00:00Z"),
        endTime: new Date("2026-11-01T17:00:00Z"),
        locationName: "Main Hall",
        status: "pending",
        community: { id: "comm-1", name: "Dev Club", slug: "dev-club" },
        venue: { id: "v-1", name: "Main Hall", building: "Building A", capacity: 200 },
        reviewer: null,
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.events).toHaveLength(1);
    expect(data.events[0].id).toBe("ev-1");
    expect(data.events[0].title).toBe("Hackathon 2026");
    expect(data.events[0].campus_id).toBe("campus-1");
    expect(data.events[0].community.name).toBe("Dev Club");
    expect(data.events[0].venue.name).toBe("Main Hall");
    expect(data.events[0].reviewer).toBeUndefined();

    expect(mockFindMany).toHaveBeenCalledTimes(1);
  });

  it("rejects admin users without campus association with 403", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      userId: "u-admin",
      isLead: false,
      isAdmin: true,
      isPrincipal: false,
      leadCommunities: [],
    } as unknown as AuthSession);

    const res = await GET();
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Campus association required");
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("scopes events to campusId for admin users associated with a campus", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      userId: "u-admin",
      isLead: false,
      isAdmin: true,
      isPrincipal: false,
      profile: { campus_id: "campus-aisat" },
      leadCommunities: [],
    } as unknown as AuthSession);

    mockFindMany.mockResolvedValueOnce([]);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.anything(),
      })
    );
  });

  it("scopes events to campusId for principal users", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      userId: "u-principal",
      isLead: false,
      isAdmin: false,
      isPrincipal: true,
      profile: { campus_id: "campus-aisat" },
      leadCommunities: [],
    } as unknown as AuthSession);

    mockFindMany.mockResolvedValueOnce([]);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.anything(),
      })
    );
  });

  it("handles query errors with 500 status", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      userId: "u-lead",
      isLead: true,
      isAdmin: false,
      isPrincipal: false,
      leadCommunities: [{ id: "c-1" }],
    } as unknown as AuthSession);

    mockFindMany.mockRejectedValueOnce(new Error("Database connection lost"));

    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Failed to load lead events");
  });
});

describe("Lead Events API - POST /api/lead/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ from: mockSelectFrom });
    mockCheckEventConflicts.mockResolvedValue({
      hasConflict: false,
      hasVenueConflict: false,
      hasLeadTimeViolation: false,
      leadTimeDays: 14,
      safeSlots: [],
      message: "Slot is available.",
    });
  });

  const validPayload = {
    title: "AI Workshop",
    category: "Tech",
    venueId: "11111111-1111-4111-a111-111111111111",
    startTime: "2026-11-10T10:00:00.000Z",
    endTime: "2026-11-10T12:00:00.000Z",
    description: "Intro to modern AI tooling",
    communityId: "22222222-2222-4222-a222-222222222222",
  };

  it("returns 401 when unauthenticated", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);

    const req = new Request("http://localhost/api/lead/events", {
      method: "POST",
      body: JSON.stringify(validPayload),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when request body fails validation", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      userId: "u-lead",
      isLead: true,
      isAdmin: false,
      leadCommunities: [{ id: "comm-1" }],
    } as unknown as AuthSession);

    const req = new Request("http://localhost/api/lead/events", {
      method: "POST",
      body: JSON.stringify({ title: "" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when proposing for an unauthorized community", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      userId: "u-lead",
      isLead: true,
      isAdmin: false,
      leadCommunities: [{ id: "comm-other" }],
    } as unknown as AuthSession);

    const req = new Request("http://localhost/api/lead/events", {
      method: "POST",
      body: JSON.stringify(validPayload),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("Forbidden");
  });

  it("returns 404 when selected venue does not exist", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      userId: "u-lead",
      isLead: true,
      isAdmin: false,
      leadCommunities: [{ id: "22222222-2222-4222-a222-222222222222" }],
    } as unknown as AuthSession);

    mockSelectLimit.mockResolvedValueOnce([]); // No venue found

    const req = new Request("http://localhost/api/lead/events", {
      method: "POST",
      body: JSON.stringify(validPayload),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain("venue not found");
  });

  it("creates event proposal successfully and returns pending event", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      userId: "u-lead",
      isLead: true,
      isAdmin: false,
      leadCommunities: [{ id: "22222222-2222-4222-a222-222222222222" }],
    } as unknown as AuthSession);

    mockSelectLimit.mockResolvedValueOnce([
      { name: "Tech Lab", campusId: "campus-1" },
    ]);

    mockInsertReturning.mockResolvedValueOnce([
      {
        id: "ev-new-1",
        campusId: "campus-1",
        communityId: "comm-1",
        venueId: "v-1",
        createdBy: "u-lead",
        title: "AI Workshop",
        slug: "ai-workshop-1234",
        description: "Intro to modern AI tooling",
        category: "Tech",
        startTime: new Date("2026-11-10T10:00:00.000Z"),
        endTime: new Date("2026-11-10T12:00:00.000Z"),
        locationName: "Tech Lab",
        status: "pending",
        coverImageUrl: null,
        externalRegistrationUrl: null,
      },
    ]);

    const req = new Request("http://localhost/api/lead/events", {
      method: "POST",
      body: JSON.stringify(validPayload),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.event.id).toBe("ev-new-1");
    expect(data.event.title).toBe("AI Workshop");
    expect(data.event.status).toBe("pending");
    expect(data.event.campus_id).toBe("campus-1");
  });

  it("returns 409 when venue conflict is detected by the server conflict guard", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      userId: "u-lead",
      isLead: true,
      isAdmin: false,
      leadCommunities: [{ id: "22222222-2222-4222-a222-222222222222" }],
    } as unknown as AuthSession);

    mockSelectLimit.mockResolvedValueOnce([
      { name: "Tech Lab", campusId: "campus-1" },
    ]);

    mockCheckEventConflicts.mockResolvedValueOnce({
      hasConflict: true,
      hasVenueConflict: true,
      hasLeadTimeViolation: false,
      leadTimeDays: 14,
      safeSlots: [],
      message: "This venue is already booked for the selected time slot.",
    });

    const req = new Request("http://localhost/api/lead/events", {
      method: "POST",
      body: JSON.stringify(validPayload),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain("Conflict: This venue is already booked");
    expect(data.conflict.hasVenueConflict).toBe(true);
  });
});
