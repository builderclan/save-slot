import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";

vi.mock("@/server/reports", () => ({
  getPublicVerifyPayload: vi.fn(),
}));

import { getPublicVerifyPayload } from "@/server/reports";

describe("GET /api/verify/[code]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when reference code is not found", async () => {
    vi.mocked(getPublicVerifyPayload).mockResolvedValue({
      ok: false,
      status: 404,
      error: "No verified event record found for this reference code.",
    });

    const res = await GET(new Request("http://localhost/api/verify/AISAT-INVALID"), {
      params: Promise.resolve({ code: "AISAT-INVALID" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns verified payload without auth", async () => {
    vi.mocked(getPublicVerifyPayload).mockResolvedValue({
      ok: true,
      data: {
        reference_number: "AISAT-2026-CSE-001",
        academic_year: "2026-27",
        title: "AI Workshop",
        origin_type: "department",
        host_name: "Computer Science & Engineering",
        host_code: "CSE",
        community_scope: null,
        category: "technical",
        start_time: "2026-11-20T09:00:00Z",
        end_time: "2026-11-20T16:00:00Z",
        location_name: "Main Seminar Hall",
        venue_name: "Main Seminar Hall",
        venue_building: "Academic Block A",
        status: "completed",
        is_lead_time_overridden: false,
        college_name: "AISAT",
        college_short_code: "AISAT",
        letterhead_subtitle: null,
        co_hosts: [],
        approval_chain: [],
      },
    });

    const res = await GET(new Request("http://localhost/api/verify/AISAT-2026-CSE-001"), {
      params: Promise.resolve({ code: "AISAT-2026-CSE-001" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reference_number).toBe("AISAT-2026-CSE-001");
    expect(json.status).toBe("completed");
  });
});
