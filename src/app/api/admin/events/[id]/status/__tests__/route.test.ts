import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import type { QueryResult, QueryResultRow } from "pg";
import type { CampusEvent } from "@/types/database";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/db", () => {
  const mockQueryFn = vi.fn();
  return {
    query: mockQueryFn,
    withTransaction: vi.fn(async (cb) => cb({ query: mockQueryFn })),
  };
});

vi.mock("@/lib/conflicts/engine", () => ({
  checkEventConflicts: vi.fn(),
}));

import { getCurrentUser, type AuthSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { checkEventConflicts } from "@/lib/conflicts/engine";

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockQuery = vi.mocked(query);
const mockCheckEventConflicts = vi.mocked(checkEventConflicts);


function mockDbResult<T extends QueryResultRow>(rows: T[]): QueryResult<T> {
  return {
    rows,
    command: "SELECT",
    rowCount: rows.length,
    oid: 0,
    fields: [],
  };
}

describe("POST /api/admin/events/[id]/status (Security & Approval Collision Guard)", () => {
  const eventId = "e1111111-2222-3333-4444-555555555555";
  const venueId = "v1111111-2222-3333-4444-555555555555";

  const adminSession: AuthSession = {
    userId: "admin-uuid",
    email: "admin@campus.edu",
    profile: {
      id: "admin-uuid",
      email: "admin@campus.edu",
      full_name: "Campus Admin",
      role: "admin",
      campus_id: "c-1",
    },
    isAdmin: true,
    isPrincipal: false,
    isVicePrincipal: false,
    isLead: false,
    leadCommunities: [],
  };

  const principalSession: AuthSession = {
    userId: "principal-uuid",
    email: "principal@campus.edu",
    profile: {
      id: "principal-uuid",
      email: "principal@campus.edu",
      full_name: "College Principal",
      role: "principal",
      campus_id: "c-1",
    },
    isAdmin: false,
    isPrincipal: true,
    isVicePrincipal: false,
    isLead: false,
    leadCommunities: [],
  };

  const vicePrincipalSession: AuthSession = {
    userId: "vice-principal-uuid",
    email: "viceprincipal@campus.edu",
    profile: {
      id: "vice-principal-uuid",
      email: "viceprincipal@campus.edu",
      full_name: "Dr. Sarah Varghese (Vice Principal)",
      role: "vice_principal",
      campus_id: "c-1",
    },
    isAdmin: false,
    isPrincipal: true,
    isVicePrincipal: true,
    isLead: false,
    leadCommunities: [],
  };

  const studentSession: AuthSession = {
    userId: "student-uuid",
    email: "student@campus.edu",
    profile: {
      id: "student-uuid",
      email: "student@campus.edu",
      full_name: "Student",
      role: "student",
      campus_id: "c-1",
    },
    isAdmin: false,
    isPrincipal: false,
    isVicePrincipal: false,
    isLead: false,
    leadCommunities: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 Forbidden when user is unauthenticated or not an admin/principal", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(studentSession);

    const req = new Request(`http://localhost/api/admin/events/${eventId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: eventId }) });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("Unauthorized");
  });

  it("returns 400 Bad Request when request body has an invalid status", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(adminSession);

    const req = new Request(`http://localhost/api/admin/events/${eventId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "deleted" }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: eventId }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Status must be 'published', 'rejected', or 'pending'");
  });

  it("returns 404 Not Found when event does not exist", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(principalSession);

    // DB query for target event returns empty rows
    mockQuery.mockResolvedValueOnce(mockDbResult([]));

    const req = new Request(`http://localhost/api/admin/events/${eventId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: eventId }) });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain("Event not found");
  });

  it("returns 409 Conflict when publishing an event that collides with another booked event", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(principalSession);

    const targetEvent = {
      id: eventId,
      venue_id: venueId,
      start_time: "2026-10-25T14:00:00.000Z",
      end_time: "2026-10-25T17:00:00.000Z",
      title: "Design Summit 2026",
    };

    mockQuery.mockResolvedValueOnce(mockDbResult([targetEvent]));

    mockCheckEventConflicts.mockResolvedValueOnce({
      hasConflict: true,
      hasLeadTimeViolation: false,
      leadTimeDays: 14,
      conflictingEvent: {
        id: "clashing-event-uuid",
        title: "Robotics Workshop",
        start_time: "2026-10-25T13:00:00.000Z",
        end_time: "2026-10-25T16:00:00.000Z",
      } as unknown as CampusEvent,
      message: "Venue collision: Main Auditorium is already booked.",
      safeSlots: [],
    });

    const req = new Request(`http://localhost/api/admin/events/${eventId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: eventId }) });
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain("Cannot publish event: Venue collision detected");
    expect(data.conflict.hasConflict).toBe(true);

    // Verify UPDATE query was NOT executed
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it("approves event and returns 200 when clash check passes cleanly", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(adminSession);

    const targetEvent = {
      id: eventId,
      venue_id: venueId,
      start_time: "2026-10-25T14:00:00.000Z",
      end_time: "2026-10-25T17:00:00.000Z",
      title: "Design Summit 2026",
    };

    const updatedEvent = {
      ...targetEvent,
      status: "published",
      updated_at: new Date().toISOString(),
    };

    // 1st query: select event details
    // 2nd query: transactional race check (empty rows = no concurrent collision)
    // 3rd query: update event status
    mockQuery
      .mockResolvedValueOnce(mockDbResult([targetEvent]))
      .mockResolvedValueOnce(mockDbResult([]))
      .mockResolvedValueOnce(mockDbResult([updatedEvent]));

    mockCheckEventConflicts.mockResolvedValueOnce({
      hasConflict: false,
      hasLeadTimeViolation: false,
      leadTimeDays: 14,
      conflictingEvent: null,
      message: "Slot is verified clash-free.",
      safeSlots: [],
    });

    const req = new Request(`http://localhost/api/admin/events/${eventId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: eventId }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.event.status).toBe("published");
    expect(mockQuery).toHaveBeenCalledTimes(3);
  });

  it("returns 409 Conflict when a concurrent transaction locks a colliding event right before update", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(adminSession);

    const targetEvent = {
      id: eventId,
      venue_id: venueId,
      start_time: "2026-10-25T14:00:00.000Z",
      end_time: "2026-10-25T17:00:00.000Z",
      title: "Design Summit 2026",
    };

    // 1st query: select event details
    // 2nd query: transactional race check finds a colliding event approved concurrently!
    mockQuery
      .mockResolvedValueOnce(mockDbResult([targetEvent]))
      .mockResolvedValueOnce(mockDbResult([{ id: "concurrent-event", title: "Concurrent Workshop" }]));

    mockCheckEventConflicts.mockResolvedValueOnce({
      hasConflict: false,
      hasLeadTimeViolation: false,
      leadTimeDays: 14,
      conflictingEvent: null,
      message: "Slot is verified clash-free.",
      safeSlots: [],
    });

    const req = new Request(`http://localhost/api/admin/events/${eventId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: eventId }) });
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain("Concurrent approval clash detected");
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it("updates status to rejected with reason without executing conflict check", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(principalSession);

    const targetEvent = {
      id: eventId,
      venue_id: venueId,
      start_time: "2026-10-25T14:00:00.000Z",
      end_time: "2026-10-25T17:00:00.000Z",
      title: "Design Summit 2026",
    };

    const rejectedEvent = {
      ...targetEvent,
      status: "rejected",
      rejection_reason: "Faculty advisor signature missing.",
      updated_at: new Date().toISOString(),
    };

    mockQuery
      .mockResolvedValueOnce(mockDbResult([targetEvent]))
      .mockResolvedValueOnce(mockDbResult([rejectedEvent]));

    const req = new Request(`http://localhost/api/admin/events/${eventId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "rejected",
        rejectionReason: "Faculty advisor signature missing.",
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: eventId }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.event.rejection_reason).toBe("Faculty advisor signature missing.");

    // Conflict check is skipped for rejections
    expect(mockCheckEventConflicts).not.toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it("authorizes Vice Principal to approve events with identical executive authority", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(vicePrincipalSession);

    const targetEvent = {
      id: eventId,
      venue_id: venueId,
      start_time: "2026-10-25T14:00:00.000Z",
      end_time: "2026-10-25T17:00:00.000Z",
      title: "Executive Symposium 2026",
    };

    const updatedEvent = {
      ...targetEvent,
      status: "published",
      updated_at: new Date().toISOString(),
    };

    mockQuery
      .mockResolvedValueOnce(mockDbResult([targetEvent]))
      .mockResolvedValueOnce(mockDbResult([]))
      .mockResolvedValueOnce(mockDbResult([updatedEvent]));

    mockCheckEventConflicts.mockResolvedValueOnce({
      hasConflict: false,
      hasLeadTimeViolation: false,
      leadTimeDays: 14,
      conflictingEvent: null,
      message: "Slot is verified clash-free.",
      safeSlots: [],
    });

    const req = new Request(`http://localhost/api/admin/events/${eventId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: eventId }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.event.status).toBe("published");
    expect(mockQuery).toHaveBeenCalledTimes(3);

    // Verify that the UPDATE query attributes decision to the Vice Principal
    const updateCall = mockQuery.mock.calls[2];
    expect(updateCall[0]).toContain("reviewed_by = $3");
    expect(updateCall[1]).toEqual(["published", null, vicePrincipalSession.userId, eventId]);
  });
});
