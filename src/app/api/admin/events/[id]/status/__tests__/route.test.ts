import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import type { CampusEvent } from "@/types/database";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const {
  mockSelect,
  mockSelectFrom,
  mockSelectWhere,
  mockSelectLimit,
  mockSelectFor,
  mockUpdate,
  mockUpdateSet,
  mockUpdateWhere,
  mockUpdateReturning,
  mockTransaction,
} = vi.hoisted(() => {
  const mockSelectFor = vi.fn();
  const mockSelectLimit = vi.fn();
  const mockSelectWhere = vi.fn();
  const mockSelectFrom = vi.fn();
  const mockSelect = vi.fn();

  const mockUpdateReturning = vi.fn();
  const mockUpdateWhere = vi.fn();
  const mockUpdateSet = vi.fn();
  const mockUpdate = vi.fn();

  const mockTransaction = vi.fn();

  mockSelectWhere.mockReturnValue({
    limit: mockSelectLimit,
    for: mockSelectFor,
  });
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockSelect.mockReturnValue({ from: mockSelectFrom });

  mockUpdateWhere.mockReturnValue({ returning: mockUpdateReturning });
  mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
  mockUpdate.mockReturnValue({ set: mockUpdateSet });

  return {
    mockSelect,
    mockSelectFrom,
    mockSelectWhere,
    mockSelectLimit,
    mockSelectFor,
    mockUpdate,
    mockUpdateSet,
    mockUpdateWhere,
    mockUpdateReturning,
    mockTransaction,
  };
});

vi.mock("@/lib/db", () => {
  const mockDbClient = {
    select: mockSelect,
    update: mockUpdate,
    transaction: mockTransaction,
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

  const sampleTargetEvent = {
    id: eventId,
    venueId: venueId,
    startTime: new Date("2026-10-25T14:00:00.000Z"),
    endTime: new Date("2026-10-25T17:00:00.000Z"),
    title: "Design Summit 2026",
  };

  const sampleUpdatedEvent = {
    id: eventId,
    campusId: "c-1",
    communityId: "comm-1",
    venueId: venueId,
    title: "Design Summit 2026",
    slug: "design-summit-2026",
    description: "Annual design summit.",
    category: "Tech",
    startTime: new Date("2026-10-25T14:00:00.000Z"),
    endTime: new Date("2026-10-25T17:00:00.000Z"),
    locationName: "Main Auditorium",
    status: "published",
    rejectionReason: null,
    reviewedBy: "admin-uuid",
    createdAt: new Date("2026-10-01T10:00:00.000Z"),
    updatedAt: new Date("2026-10-25T14:00:00.000Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectFor.mockResolvedValue([]);
    mockSelectLimit.mockResolvedValue([]);
    mockSelectWhere.mockReturnValue({
      limit: mockSelectLimit,
      for: mockSelectFor,
    });
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
    mockSelect.mockReturnValue({ from: mockSelectFrom });
    mockUpdateWhere.mockReturnValue({ returning: mockUpdateReturning });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdate.mockReturnValue({ set: mockUpdateSet });
    mockTransaction.mockImplementation(async (cb) => {
      const tx = {
        select: mockSelect,
        update: mockUpdate,
      };
      return cb(tx);
    });
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

    // Target event lookup returns empty
    mockSelectLimit.mockResolvedValueOnce([]);

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

    mockSelectLimit.mockResolvedValueOnce([sampleTargetEvent]);

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
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("approves event and returns 200 when clash check passes cleanly", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(adminSession);

    mockSelectLimit.mockResolvedValueOnce([sampleTargetEvent]);
    mockUpdateReturning.mockResolvedValueOnce([sampleUpdatedEvent]);

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
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockSelectFor).toHaveBeenCalledTimes(2); // 1. Venue row lock, 2. Overlap clash check
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("returns 409 Conflict when a concurrent transaction locks a colliding event right before update", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(adminSession);

    mockSelectLimit.mockResolvedValueOnce([sampleTargetEvent]);
    // 1st .for("update"): Venue mutual-exclusion lock
    // 2nd .for("update"): Race check discovers concurrent colliding event
    mockSelectFor
      .mockResolvedValueOnce([{ id: venueId }])
      .mockResolvedValueOnce([{ id: "concurrent-event", title: "Concurrent Workshop" }]);

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
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("updates status to rejected with reason without executing conflict check", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(principalSession);

    const rejectedEvent = {
      ...sampleUpdatedEvent,
      status: "rejected",
      rejectionReason: "Faculty advisor signature missing.",
    };

    mockSelectLimit.mockResolvedValueOnce([sampleTargetEvent]);
    mockUpdateReturning.mockResolvedValueOnce([rejectedEvent]);

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
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("authorizes Vice Principal to approve events with identical executive authority", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(vicePrincipalSession);

    mockSelectLimit.mockResolvedValueOnce([sampleTargetEvent]);
    mockUpdateReturning.mockResolvedValueOnce([
      {
        ...sampleUpdatedEvent,
        reviewedBy: vicePrincipalSession.userId,
      },
    ]);

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
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ reviewedBy: vicePrincipalSession.userId })
    );
  });
});
