import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";

vi.mock("@/lib/conflicts/engine", () => ({
  checkEventConflicts: vi.fn(),
}));

import { checkEventConflicts } from "@/lib/conflicts/engine";

const mockCheckConflicts = vi.mocked(checkEventConflicts);

describe("Conflict Check API Endpoint (POST /api/conflicts/check)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when body is invalid or missing required fields", async () => {
    const req = new Request("http://localhost/api/conflicts/check", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("returns 400 when venueId is not a valid UUID", async () => {
    const req = new Request("http://localhost/api/conflicts/check", {
      method: "POST",
      body: JSON.stringify({
        venueId: "not-a-uuid",
        startTime: "2026-10-25T10:00:00.000Z",
        endTime: "2026-10-25T12:00:00.000Z",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid venue ID");
  });

  it("delegates to checkEventConflicts and returns result on valid payload", async () => {
    const mockResult = {
      hasConflict: false,
      hasLeadTimeViolation: false,
      leadTimeDays: 10,
      conflictingEvent: null,
      message: "This slot is verified and completely clash-free.",
      safeSlots: [],
    };

    mockCheckConflicts.mockResolvedValueOnce(mockResult);

    const validPayload = {
      venueId: "a1b2c3d4-e5f6-4a7b-8c9d-ef0123456789",
      startTime: "2026-10-25T10:00:00.000Z",
      endTime: "2026-10-25T12:00:00.000Z",
    };

    const req = new Request("http://localhost/api/conflicts/check", {
      method: "POST",
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.hasConflict).toBe(false);
    expect(data.message).toContain("clash-free");
    expect(mockCheckConflicts).toHaveBeenCalledWith(
      expect.objectContaining({
        venueId: validPayload.venueId,
        startTime: validPayload.startTime,
        endTime: validPayload.endTime,
      })
    );
  });
});
