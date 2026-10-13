import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkEventConflicts } from "../engine";
import { addDays } from "date-fns";
import util from "util";

const {
  mockSelect,
  mockSelectWhereCalls,
  queueQueryResults,
  resetQueryQueue,
} = vi.hoisted(() => {
  let queryQueue: unknown[][] = [];
  const mockSelectWhereCalls: unknown[] = [];

  const queueQueryResults = (...results: unknown[][]) => {
    queryQueue.push(...results);
  };

  const resetQueryQueue = () => {
    queryQueue = [];
    mockSelectWhereCalls.length = 0;
  };

  const mockSelect = vi.fn().mockImplementation(() => {
    const createChain = () => {
      const getNext = () => queryQueue.shift() ?? [];
      const chain: any = {
        from: vi.fn().mockImplementation(() => chain),
        innerJoin: vi.fn().mockImplementation(() => chain),
        leftJoin: vi.fn().mockImplementation(() => chain),
        where: vi.fn().mockImplementation((...args: unknown[]) => {
          mockSelectWhereCalls.push(args[0]);
          return chain;
        }),
        orderBy: vi.fn().mockImplementation(() => chain),
        limit: vi.fn().mockImplementation(() => Promise.resolve(getNext())),
        then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
          Promise.resolve(getNext()).then(resolve, reject),
      };
      return chain;
    };
    return createChain();
  });

  return {
    mockSelect,
    mockSelectWhereCalls,
    queueQueryResults,
    resetQueryQueue,
  };
});

vi.mock("@/lib/db", () => {
  const mockDbClient = {
    select: mockSelect,
  };

  return {
    db: mockDbClient,
    withDbRetry: (op: (client: typeof mockDbClient) => Promise<unknown>) => op(mockDbClient),
  };
});

describe("Conflict Detection Engine (checkEventConflicts)", () => {
  const venueId = "11111111-2222-3333-4444-555555555555";
  const mockVenue = {
    id: venueId,
    campus_id: "campus-uuid-1",
    name: "Turing Auditorium",
    building: "Computer Science Center",
    capacity: 250,
    is_active: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetQueryQueue();
  });

  it("verifies a completely clean slot (no clashes and >= 7 days notice)", async () => {
    const futureDate = addDays(new Date(), 10);
    const startTime = new Date(futureDate.setHours(14, 0, 0, 0)).toISOString();
    const endTime = new Date(futureDate.setHours(17, 0, 0, 0)).toISOString();

    // 1st query: target venue lookup
    // 2nd query: clash search (empty rows = no collision)
    queueQueryResults([mockVenue], []);

    const result = await checkEventConflicts({
      venueId,
      startTime,
      endTime,
    });

    expect(result.hasConflict).toBe(false);
    expect(result.hasLeadTimeViolation).toBe(false);
    expect(result.conflictingEvent).toBeNull();
    expect(result.message).toContain("verified and completely clash-free");
    expect(result.safeSlots).toHaveLength(0);
  });

  it("flags a lead-time policy violation when event is less than 7 days in advance", async () => {
    const nearDate = addDays(new Date(), 3); // 3 days away (< 7)
    const startTime = new Date(nearDate.setHours(10, 0, 0, 0)).toISOString();
    const endTime = new Date(nearDate.setHours(12, 0, 0, 0)).toISOString();

    queueQueryResults(
      [mockVenue], // venue
      [], // no venue collision
      [], // earliest safe date check
      [], // alt venues query
      [] // following day check
    );

    const result = await checkEventConflicts({
      venueId,
      startTime,
      endTime,
    });

    expect(result.hasConflict).toBe(false);
    expect(result.hasLeadTimeViolation).toBe(true);
    expect(result.message).toContain("must be submitted at least 7 days in advance");
    expect(result.leadTimeDays).toBeLessThan(7);
    expect(result.safeSlots.length).toBeGreaterThan(0);
    // Verified that suggestions are policy-cleared safe dates (>= 7 days in advance)
    expect(result.safeSlots[0].label).toContain("Earliest Safe Date");
  });

  it("handles overnight events ending the following day with positive duration", async () => {
    const futureDate = addDays(new Date(), 10);
    const startTime = new Date(futureDate.setHours(21, 0, 0, 0)).toISOString();
    const nextDay = addDays(futureDate, 1);
    const endTime = new Date(nextDay.setHours(2, 0, 0, 0)).toISOString();

    queueQueryResults([mockVenue], []);

    const result = await checkEventConflicts({
      venueId,
      startTime,
      endTime,
    });

    expect(result.hasConflict).toBe(false);
    expect(result.hasLeadTimeViolation).toBe(false);
    expect(result.message).toContain("verified and completely clash-free");
  });

  it("detects a hard collision when another event occupies the same venue at overlapping time", async () => {
    const futureDate = addDays(new Date(), 12);
    const startTime = new Date(futureDate.setHours(14, 0, 0, 0)).toISOString();
    const endTime = new Date(futureDate.setHours(17, 0, 0, 0)).toISOString();

    const conflictingEvent = {
      id: "event-clash-123",
      campus_id: "campus-uuid-1",
      community_id: "comm-1",
      title: "Robotics Workshop",
      slug: "robotics-workshop",
      description: "Hands-on robotics session",
      start_time: startTime,
      end_time: endTime,
      location_name: "Turing Auditorium",
      category: "Tech" as const,
      status: "published" as const,
      venue_id: venueId,
      community: { id: "comm-1", campus_id: "campus-uuid-1", name: "IEEE Student Branch", slug: "ieee", category: "Tech" as const },
      venue: mockVenue,
    };

    queueQueryResults(
      [mockVenue], // venue lookup
      [conflictingEvent], // collision found
      [], // slot1 later same day check (clean)
      [], // alt venues query
      [] // next day check
    );

    const result = await checkEventConflicts({
      venueId,
      startTime,
      endTime,
    });

    expect(result.hasConflict).toBe(true);
    expect(result.conflictingEvent?.id).toBe("event-clash-123");
    expect(result.message).toContain("Venue collision: Turing Auditorium is already booked by IEEE Student Branch");
    expect(result.safeSlots.length).toBeGreaterThan(0);
    // Should suggest same venue later
    const sameVenueLater = result.safeSlots.find((s) => s.type === "same_venue_later");
    expect(sameVenueLater).toBeDefined();
    expect(sameVenueLater?.reason).toContain("30-minute buffer after IEEE Student Branch concludes");
  });

  it("ignores self when excludeEventId is supplied during rescheduling", async () => {
    const futureDate = addDays(new Date(), 10);
    const startTime = new Date(futureDate.setHours(14, 0, 0, 0)).toISOString();
    const endTime = new Date(futureDate.setHours(17, 0, 0, 0)).toISOString();
    const currentEventId = "my-current-event-uuid";

    queueQueryResults([mockVenue], []);

    const result = await checkEventConflicts({
      venueId,
      startTime,
      endTime,
      excludeEventId: currentEventId,
    });

    expect(result.hasConflict).toBe(false);
    expect(result.hasLeadTimeViolation).toBe(false);

    // Verify Drizzle condition included excludeEventId
    const clashWhereCall = mockSelectWhereCalls[1];
    expect(util.inspect(clashWhereCall, { depth: null })).toContain(currentEventId);
  });
});
