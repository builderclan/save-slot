import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  checkEventConflicts,
  doAudiencesOverlap,
  getOverlappingAudience,
} from "../engine";
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
      interface MockSelectChain {
        from: (table: unknown) => MockSelectChain;
        innerJoin: (...args: unknown[]) => MockSelectChain;
        leftJoin: (...args: unknown[]) => MockSelectChain;
        where: (...args: unknown[]) => MockSelectChain;
        orderBy: (...args: unknown[]) => MockSelectChain;
        limit: (...args: unknown[]) => Promise<unknown[]>;
        then: (
          resolve: (v: unknown[]) => unknown,
          reject?: (e: unknown) => unknown
        ) => Promise<unknown>;
      }

      const chain: MockSelectChain = {
        from: vi.fn().mockImplementation(() => chain),
        innerJoin: vi.fn().mockImplementation(() => chain),
        leftJoin: vi.fn().mockImplementation(() => chain),
        where: vi.fn().mockImplementation((...args: unknown[]) => {
          mockSelectWhereCalls.push(args[0]);
          return chain;
        }),
        orderBy: vi.fn().mockImplementation(() => chain),
        limit: vi.fn().mockImplementation(() => Promise.resolve(getNext())),
        then: (resolve, reject) =>
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
    expect(result.message).toContain('Turing Auditorium is already booked for "Robotics Workshop" by IEEE Student Branch');
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

  describe("Target Audience Conflict Detection", () => {
    it("evaluates audience overlap correctly", () => {
      // Both All Students
      expect(doAudiencesOverlap(["All Students"], ["All Students"])).toBe(true);
      // All Students overlaps with specific year cohorts
      expect(doAudiencesOverlap(["All Students"], ["1st Year", "2nd Year"])).toBe(true);
      expect(doAudiencesOverlap(["3rd Year"], ["All Students"])).toBe(true);
      // Same cohort
      expect(doAudiencesOverlap(["2nd Year"], ["2nd Year", "3rd Year"])).toBe(true);
      // Disjoint cohorts
      expect(doAudiencesOverlap(["1st Year"], ["4th Year"])).toBe(false);
      expect(doAudiencesOverlap(["1st Year", "2nd Year"], ["3rd Year", "Final Year"])).toBe(false);
      // Faculty & Staff vs purely student cohorts
      expect(doAudiencesOverlap(["Faculty & Staff"], ["1st Year"])).toBe(false);
    });

    it("extracts overlapping audience cohorts correctly", () => {
      expect(getOverlappingAudience(["All Students"], ["All Students"])).toEqual(["All Students"]);
      expect(getOverlappingAudience(["All Students"], ["2nd Year"])).toEqual(["2nd Year"]);
      expect(getOverlappingAudience(["1st Year", "2nd Year"], ["2nd Year", "3rd Year"])).toEqual(["2nd Year"]);
      expect(getOverlappingAudience(["1st Year"], ["3rd Year"])).toEqual([]);
    });

    it("detects an audience collision when another event shares the target audience concurrently in a different venue", async () => {
      const futureDate = addDays(new Date(), 10);
      const startTime = new Date(futureDate.setHours(14, 0, 0, 0)).toISOString();
      const endTime = new Date(futureDate.setHours(17, 0, 0, 0)).toISOString();

      const competingEvent = {
        id: "competing-event-456",
        campus_id: "campus-uuid-1",
        community_id: "comm-2",
        title: "Web Dev Bootcamp",
        slug: "web-dev-bootcamp",
        description: "Hands-on web dev",
        start_time: startTime,
        end_time: endTime,
        location_name: "Ada Lovelace Lab",
        category: "Tech" as const,
        status: "published" as const,
        venue_id: "different-venue-uuid",
        target_audience: ["2nd Year", "3rd Year"],
        community: { id: "comm-2", campus_id: "campus-uuid-1", name: "Web Dev Society", slug: "web-dev", category: "Tech" as const },
        venue: { id: "different-venue-uuid", name: "Ada Lovelace Lab", capacity: 50 },
      };

      queueQueryResults(
        [mockVenue], // 1: venue lookup
        [], // 2: venue clash (clean: no one in Turing Auditorium)
        [competingEvent], // 3: concurrent audience check (found event sharing 2nd Year)
        [], // 4: safe slot same venue later check
        [] // 5: safe slot next day check
      );

      const result = await checkEventConflicts({
        venueId,
        startTime,
        endTime,
        targetAudience: ["2nd Year"],
      });

      expect(result.hasConflict).toBe(false); // No venue clash
      expect(result.hasVenueConflict).toBe(false);
      expect(result.hasAudienceConflict).toBe(true);
      expect(result.conflictingAudienceEvent?.id).toBe("competing-event-456");
      expect(result.overlappingAudience).toContain("2nd Year");
      expect(result.message).toContain('"Web Dev Bootcamp" (Web Dev Society) is scheduled at the same time for 2nd Year');
      // Safe slot should suggest same venue later (after competing event concludes) or next day
      expect(result.safeSlots.length).toBeGreaterThan(0);
      // Alternative venue at the SAME TIME should NOT be suggested because audience clash exists at this time window
      const altSameTime = result.safeSlots.find((s) => s.type === "alternative_venue");
      expect(altSameTime).toBeUndefined();
    });

    it("reports completely clash-free when concurrent event has completely disjoint target audience", async () => {
      const futureDate = addDays(new Date(), 10);
      const startTime = new Date(futureDate.setHours(14, 0, 0, 0)).toISOString();
      const endTime = new Date(futureDate.setHours(17, 0, 0, 0)).toISOString();

      const nonCompetingEvent = {
        id: "senior-event-789",
        campus_id: "campus-uuid-1",
        community_id: "comm-3",
        title: "Final Year Placement Prep",
        slug: "final-year-placement-prep",
        description: "Placement preparation",
        start_time: startTime,
        end_time: endTime,
        location_name: "Seminar Hall B",
        category: "Career" as const,
        status: "published" as const,
        venue_id: "diff-venue-2",
        target_audience: ["Final Year"],
        community: { id: "comm-3", campus_id: "campus-uuid-1", name: "Placement Cell", slug: "placements", category: "Career" as const },
        venue: { id: "diff-venue-2", name: "Seminar Hall B", capacity: 80 },
      };

      queueQueryResults(
        [mockVenue], // venue lookup
        [], // venue clash (clean)
        [nonCompetingEvent] // concurrent events query (returns non-competing event)
      );

      const result = await checkEventConflicts({
        venueId,
        startTime,
        endTime,
        targetAudience: ["1st Year"], // 1st Year != Final Year -> Disjoint!
      });

      expect(result.hasConflict).toBe(false);
      expect(result.hasAudienceConflict).toBe(false);
      expect(result.conflictingAudienceEvent).toBeNull();
      expect(result.message).toContain("verified and completely clash-free");
    });
  });
});
