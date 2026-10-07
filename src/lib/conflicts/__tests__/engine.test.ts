import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkEventConflicts } from "../engine";
import { addDays } from "date-fns";
import type { QueryResult, QueryResultRow } from "pg";

// Mock the database query function
vi.mock("@/lib/db", () => ({
  query: vi.fn(),
}));

import { query } from "@/lib/db";

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
  });

  it("verifies a completely clean slot (no clashes and >= 7 days notice)", async () => {
    const futureDate = addDays(new Date(), 10);
    const startTime = new Date(futureDate.setHours(14, 0, 0, 0)).toISOString();
    const endTime = new Date(futureDate.setHours(17, 0, 0, 0)).toISOString();

    // 1st query: target venue lookup
    // 2nd query: clash search (empty rows = no collision)
    mockQuery
      .mockResolvedValueOnce(mockDbResult([mockVenue]))
      .mockResolvedValueOnce(mockDbResult([]));

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

    mockQuery
      .mockResolvedValueOnce(mockDbResult([mockVenue])) // venue
      .mockResolvedValueOnce(mockDbResult([])) // no venue collision
      .mockResolvedValueOnce(mockDbResult([])) // earliest safe date check
      .mockResolvedValueOnce(mockDbResult([])) // alt venues query
      .mockResolvedValueOnce(mockDbResult([])); // following day check

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

    mockQuery
      .mockResolvedValueOnce(mockDbResult([mockVenue]))
      .mockResolvedValueOnce(mockDbResult([]));

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

    mockQuery
      .mockResolvedValueOnce(mockDbResult([mockVenue])) // venue lookup
      .mockResolvedValueOnce(mockDbResult([conflictingEvent])) // collision found
      .mockResolvedValueOnce(mockDbResult([])) // slot1 later same day check (clean)
      .mockResolvedValueOnce(mockDbResult([])) // alt venues query
      .mockResolvedValueOnce(mockDbResult([])); // next day check

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

    mockQuery
      .mockResolvedValueOnce(mockDbResult([mockVenue]))
      .mockResolvedValueOnce(mockDbResult([])); // query filtered by e.id != excludeEventId

    const result = await checkEventConflicts({
      venueId,
      startTime,
      endTime,
      excludeEventId: currentEventId,
    });

    expect(result.hasConflict).toBe(false);
    expect(result.hasLeadTimeViolation).toBe(false);

    // Verify SQL parameter was passed
    const clashCall = mockQuery.mock.calls[1];
    expect(clashCall[0]).toContain("e.id != $4");
    expect(clashCall[1]).toContain(currentEventId);
  });
});
