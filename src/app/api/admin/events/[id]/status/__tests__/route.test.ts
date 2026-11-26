import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import type { CampusEvent } from "@/types/database";
import type { AuthSession } from "@/lib/auth";

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

import { getCurrentUser } from "@/lib/auth";
import { checkEventConflicts } from "@/lib/conflicts/engine";

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockCheckEventConflicts = vi.mocked(checkEventConflicts);

function makeSession(role: AuthSession["profile"]["role"]): AuthSession {
  return {
    userId: `${role}-uuid`,
    email: `${role}@aisat.ac.in`,
    profile: {
      id: `${role}-uuid`,
      email: `${role}@aisat.ac.in`,
      full_name: `${role} user`,
      role,
    },
    isAdmin: role === "admin",
    isPrincipal: role === "principal" || role === "vice_principal",
    isVicePrincipal: role === "vice_principal",
    isHod: role === "hod",
    isActingHod: false,
    isTic: role === "tic",
    isStaff: role === "staff",
    isLead: role === "lead",
    leadCommunities: [],
    ticCommunities: [],
    hodDepartments: [],
  };
}

describe("POST /api/admin/events/[id]/status (Executive Authority & Admin Isolation)", () => {
  const eventId = "e1111111-2222-3333-4444-555555555555";
  const venueId = "v1111111-2222-3333-4444-555555555555";

  const adminSession = makeSession("admin");
  const principalSession = makeSession("principal");
  const vicePrincipalSession = makeSession("vice_principal");
  const leadSession = makeSession("lead");

  const sampleTargetEvent = {
    id: eventId,
    venueId: venueId,
    startTime: new Date("2026-10-25T14:00:00.000Z"),
    endTime: new Date("2026-10-25T17:00:00.000Z"),
    title: "Design Summit 2026",
  };

  const sampleUpdatedEvent = {
    id: eventId,
    originType: "community",
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
    reviewedBy: "principal-uuid",
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

  it("blocks IT Admin (403 Forbidden) from approving or rejecting events", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(adminSession);

    const req = new Request(`http://localhost/api/admin/events/${eventId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: eventId }) });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("Principal or Vice Principal approval authority required");
  });

  it("returns 403 Forbidden when user is a Lead or unauthenticated", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(leadSession);

    const req = new Request(`http://localhost/api/admin/events/${eventId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: eventId }) });
    expect(res.status).toBe(403);
  });

  it("returns 400 Bad Request when Principal submits an invalid status", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(principalSession);

    const req = new Request(`http://localhost/api/admin/events/${eventId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "deleted" }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: eventId }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Status must be");
  });

  it("returns 404 Not Found when event does not exist", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(principalSession);
    mockSelectLimit.mockResolvedValueOnce([]);

    const req = new Request(`http://localhost/api/admin/events/${eventId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: eventId }) });
    expect(res.status).toBe(404);
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
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("approves event as Principal and returns 200 when clash check passes cleanly", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(principalSession);
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
    expect(mockSelectFor).toHaveBeenCalledTimes(2);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("returns 409 Conflict when concurrent transaction locks a colliding event right before update", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(principalSession);
    mockSelectLimit.mockResolvedValueOnce([sampleTargetEvent]);
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
    expect(mockCheckEventConflicts).not.toHaveBeenCalled();
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
