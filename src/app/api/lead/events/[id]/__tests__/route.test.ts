import { describe, it, expect, vi, beforeEach } from "vitest";
import { PUT, DELETE } from "../route";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const {
  mockSelect,
  mockSelectFrom,
  mockSelectLimit,
  mockUpdate,
  mockUpdateReturning,
  mockDelete,
  mockDeleteReturning,
} = vi.hoisted(() => {
  const mockSelectLimit = vi.fn();
  const mockSelectWhere = vi.fn();
  const mockSelectFrom = vi.fn();
  const mockSelect = vi.fn();

  const mockUpdateReturning = vi.fn();
  const mockUpdateWhere = vi.fn();
  const mockUpdateSet = vi.fn();
  const mockUpdate = vi.fn();

  const mockDeleteReturning = vi.fn();
  const mockDeleteWhere = vi.fn();
  const mockDelete = vi.fn();

  mockSelectWhere.mockReturnValue({ limit: mockSelectLimit });
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockSelect.mockReturnValue({ from: mockSelectFrom });

  mockUpdateWhere.mockReturnValue({ returning: mockUpdateReturning });
  mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
  mockUpdate.mockReturnValue({ set: mockUpdateSet });

  mockDeleteWhere.mockReturnValue({ returning: mockDeleteReturning });
  mockDelete.mockReturnValue({ where: mockDeleteWhere });

  return {
    mockSelect,
    mockSelectFrom,
    mockSelectLimit,
    mockUpdate,
    mockUpdateReturning,
    mockDelete,
    mockDeleteReturning,
  };
});

vi.mock("@/lib/db", () => {
  const mockDbClient = {
    select: mockSelect,
    update: mockUpdate,
    delete: mockDelete,
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

describe("Lead Event Item API - PUT /api/lead/events/[id]", () => {
  const targetId = "11111111-2222-4333-a444-555555555555";
  const validVenueId = "aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee";
  const validCommunityId = "22222222-2222-4222-a222-222222222222";

  const validPayload = {
    title: "Updated Workshop Title",
    category: "Tech",
    venueId: validVenueId,
    startTime: "2026-11-12T14:00:00.000Z",
    endTime: "2026-11-12T16:00:00.000Z",
    description: "Updated description with sufficient length.",
  };

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

  it("returns 401 when unauthenticated", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);

    const req = new Request(`http://localhost/api/lead/events/${targetId}`, {
      method: "PUT",
      body: JSON.stringify(validPayload),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: targetId }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when event to update is not found", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      userId: "u-lead",
      isLead: true,
      isAdmin: false,
      leadCommunities: [{ id: validCommunityId }],
    } as unknown as AuthSession);

    mockSelectLimit.mockResolvedValueOnce([]); // No existing event found

    const req = new Request(`http://localhost/api/lead/events/${targetId}`, {
      method: "PUT",
      body: JSON.stringify(validPayload),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: targetId }) });
    expect(res.status).toBe(404);
  });

  it("returns 403 when user is not authorized for the event community", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      userId: "u-lead",
      isLead: true,
      isAdmin: false,
      leadCommunities: [{ id: "other-community-uuid" }],
    } as unknown as AuthSession);

    mockSelectLimit.mockResolvedValueOnce([
      { id: targetId, communityId: validCommunityId, status: "pending" },
    ]);

    const req = new Request(`http://localhost/api/lead/events/${targetId}`, {
      method: "PUT",
      body: JSON.stringify(validPayload),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: targetId }) });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("Forbidden");
  });

  it("returns 400 when attempting to update a published event", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      userId: "u-lead",
      isLead: true,
      isAdmin: false,
      leadCommunities: [{ id: validCommunityId }],
    } as unknown as AuthSession);

    mockSelectLimit.mockResolvedValueOnce([
      { id: targetId, communityId: validCommunityId, status: "published" },
    ]);

    const req = new Request(`http://localhost/api/lead/events/${targetId}`, {
      method: "PUT",
      body: JSON.stringify(validPayload),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: targetId }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Published events cannot be modified");
  });

  it("returns 404 when selected venue does not exist", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      userId: "u-lead",
      isLead: true,
      isAdmin: false,
      leadCommunities: [{ id: validCommunityId }],
    } as unknown as AuthSession);

    // 1st select: existing event
    mockSelectLimit.mockResolvedValueOnce([
      { id: targetId, communityId: validCommunityId, status: "rejected" },
    ]);
    // 2nd select: venue lookup (not found)
    mockSelectLimit.mockResolvedValueOnce([]);

    const req = new Request(`http://localhost/api/lead/events/${targetId}`, {
      method: "PUT",
      body: JSON.stringify(validPayload),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: targetId }) });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain("venue not found");
  });

  it("updates proposal successfully, resetting status to pending and clearing rejection fields", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      userId: "u-lead",
      isLead: true,
      isAdmin: false,
      leadCommunities: [{ id: validCommunityId }],
    } as unknown as AuthSession);

    // 1st select: existing event (rejected previously)
    mockSelectLimit.mockResolvedValueOnce([
      { id: targetId, communityId: validCommunityId, status: "rejected" },
    ]);
    // 2nd select: venue lookup
    mockSelectLimit.mockResolvedValueOnce([
      { name: "Auditorium A" },
    ]);

    mockUpdateReturning.mockResolvedValueOnce([
      {
        id: targetId,
        campusId: "campus-1",
        communityId: validCommunityId,
        venueId: validVenueId,
        title: "Updated Workshop Title",
        slug: "updated-workshop-title",
        description: "Updated description with sufficient length.",
        category: "Tech",
        startTime: new Date("2026-11-12T14:00:00.000Z"),
        endTime: new Date("2026-11-12T16:00:00.000Z"),
        locationName: "Auditorium A",
        status: "pending",
        rejectionReason: null,
        reviewedBy: null,
      },
    ]);

    const req = new Request(`http://localhost/api/lead/events/${targetId}`, {
      method: "PUT",
      body: JSON.stringify(validPayload),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: targetId }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.event.title).toBe("Updated Workshop Title");
    expect(data.event.status).toBe("pending");
    expect(data.event.rejection_reason).toBeUndefined();
  });

  it("returns 404 when concurrent deletion causes update returning to be empty", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      userId: "u-lead",
      isLead: true,
      isAdmin: false,
      leadCommunities: [{ id: validCommunityId }],
    } as unknown as AuthSession);

    // 1st select: existing event
    mockSelectLimit.mockResolvedValueOnce([
      { id: targetId, communityId: validCommunityId, status: "pending" },
    ]);
    // 2nd select: venue lookup
    mockSelectLimit.mockResolvedValueOnce([
      { name: "Auditorium A" },
    ]);

    mockUpdateReturning.mockResolvedValueOnce([]);

    const req = new Request(`http://localhost/api/lead/events/${targetId}`, {
      method: "PUT",
      body: JSON.stringify(validPayload),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: targetId }) });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Event not found");
  });

  it("returns 409 when venue conflict is detected during event update", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      userId: "u-lead",
      isLead: true,
      isAdmin: false,
      leadCommunities: [{ id: validCommunityId }],
    } as unknown as AuthSession);

    // 1st select: existing event
    mockSelectLimit.mockResolvedValueOnce([
      { id: targetId, communityId: validCommunityId, status: "pending" },
    ]);
    // 2nd select: venue lookup
    mockSelectLimit.mockResolvedValueOnce([
      { name: "Auditorium A" },
    ]);

    mockCheckEventConflicts.mockResolvedValueOnce({
      hasConflict: true,
      hasVenueConflict: true,
      hasLeadTimeViolation: false,
      leadTimeDays: 14,
      safeSlots: [],
      message: "This venue is already booked for the selected time slot.",
    });

    const req = new Request(`http://localhost/api/lead/events/${targetId}`, {
      method: "PUT",
      body: JSON.stringify(validPayload),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: targetId }) });
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain("Conflict: This venue is already booked");
    expect(data.conflict.hasVenueConflict).toBe(true);
  });
});

describe("Lead Event Item API - DELETE /api/lead/events/[id]", () => {
  const targetId = "11111111-2222-4333-a444-555555555555";
  const validCommunityId = "22222222-2222-4222-a222-222222222222";

  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ from: mockSelectFrom });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);

    const req = new Request(`http://localhost/api/lead/events/${targetId}`, {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: targetId }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when event to delete does not exist", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      userId: "u-lead",
      isLead: true,
      isAdmin: false,
      leadCommunities: [{ id: validCommunityId }],
    } as unknown as AuthSession);

    mockSelectLimit.mockResolvedValueOnce([]); // Not found

    const req = new Request(`http://localhost/api/lead/events/${targetId}`, {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: targetId }) });
    expect(res.status).toBe(404);
  });

  it("returns 403 when user is not authorized for event community", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      userId: "u-lead",
      isLead: true,
      isAdmin: false,
      leadCommunities: [{ id: "other-community" }],
    } as unknown as AuthSession);

    mockSelectLimit.mockResolvedValueOnce([
      { id: targetId, communityId: validCommunityId, status: "pending" },
    ]);

    const req = new Request(`http://localhost/api/lead/events/${targetId}`, {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: targetId }) });
    expect(res.status).toBe(403);
  });

  it("returns 400 when attempting to delete a published event", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      userId: "u-lead",
      isLead: true,
      isAdmin: false,
      leadCommunities: [{ id: validCommunityId }],
    } as unknown as AuthSession);

    mockSelectLimit.mockResolvedValueOnce([
      { id: targetId, communityId: validCommunityId, status: "published" },
    ]);

    const req = new Request(`http://localhost/api/lead/events/${targetId}`, {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: targetId }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Published events cannot be withdrawn");
  });

  it("deletes proposal successfully and returns deletedId", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      userId: "u-lead",
      isLead: true,
      isAdmin: false,
      leadCommunities: [{ id: validCommunityId }],
    } as unknown as AuthSession);

    mockSelectLimit.mockResolvedValueOnce([
      { id: targetId, communityId: validCommunityId, status: "pending" },
    ]);

    mockDeleteReturning.mockResolvedValueOnce([{ id: targetId }]);

    const req = new Request(`http://localhost/api/lead/events/${targetId}`, {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: targetId }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.deletedId).toBe(targetId);
  });

  it("returns 404 when concurrent deletion causes delete returning to be empty", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      userId: "u-lead",
      isLead: true,
      isAdmin: false,
      leadCommunities: [{ id: validCommunityId }],
    } as unknown as AuthSession);

    mockSelectLimit.mockResolvedValueOnce([
      { id: targetId, communityId: validCommunityId, status: "pending" },
    ]);

    mockDeleteReturning.mockResolvedValueOnce([]);

    const req = new Request(`http://localhost/api/lead/events/${targetId}`, {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: targetId }) });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Event not found or no longer withdrawable");
  });
});
