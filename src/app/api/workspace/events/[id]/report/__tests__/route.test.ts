import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";
import type { AuthSession } from "@/server/auth";

vi.mock("@/server/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/revalidate", () => ({
  safeRevalidatePath: vi.fn(),
}));

vi.mock("@/server/reports", () => ({
  getDossierPayload: vi.fn(),
  submitClosureReport: vi.fn(),
}));

import { getCurrentUser } from "@/server/auth";
import { getDossierPayload, submitClosureReport } from "@/server/reports";

const mockSession: AuthSession = {
  userId: "user-1",
  email: "lead@aisat.ac.in",
  profile: {
    id: "user-1",
    email: "lead@aisat.ac.in",
    full_name: "Club Lead",
    role: "lead",
    department_id: "dept-1",
    created_at: "2026-01-01T00:00:00Z",
  },
  isAdmin: false,
  isPrincipal: false,
  isVicePrincipal: false,
  isHod: false,
  isActingHod: false,
  isFic: false,
  isStaff: false,
  isLead: true,
  leadCommunities: [],
  ficCommunities: [],
  hodDepartments: [],
};

describe("/api/workspace/events/[id]/report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 401 when unauthenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/workspace/events/ev-1/report"), {
      params: Promise.resolve({ id: "ev-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("GET returns event, report, and mentors for authorized user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockSession);
    vi.mocked(getDossierPayload).mockResolvedValue({
      ok: true,
      data: {
        collegeSettings: {
          id: 1,
          college_name: "AISAT",
          short_code: "AISAT",
          letterhead_subtitle: null,
          logo_url: null,
          academic_year_start_month: 7,
          timezone: "Asia/Kolkata",
        },
        event: {
          id: "ev-1",
          title: "Tech Fest",
          report: {
            id: "rep-1",
            event_id: "ev-1",
            actual_fund_used: 5000,
            funding_source: "College Grant",
            student_count: 100,
            faculty_count: 10,
            external_count: 5,
            summary: "Great event",
            outcomes: "Learned React",
            submitted_by: "user-1",
            submitted_at: "2026-11-27T10:00:00Z",
          },
          mentors: [],
        } as never,
      },
    });

    const res = await GET(new Request("http://localhost/api/workspace/events/ev-1/report"), {
      params: Promise.resolve({ id: "ev-1" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.event.id).toBe("ev-1");
    expect(json.report.id).toBe("rep-1");
  });

  it("POST returns 400 when closure payload is invalid", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockSession);
    const req = new Request("http://localhost/api/workspace/events/ev-1/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: "too short" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "ev-1" }) });
    expect(res.status).toBe(400);
  });

  it("POST submits closure report and returns new status", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockSession);
    vi.mocked(submitClosureReport).mockResolvedValue({
      ok: true,
      data: { status: "pending_report_verification" },
    });

    const req = new Request("http://localhost/api/workspace/events/ev-1/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actualFundUsed: 4500,
        fundingSource: "College Grant",
        studentCount: 120,
        facultyCount: 8,
        externalCount: 2,
        summary: "Annual coding workshop conducted successfully with 120 student participants.",
        outcomes: "Students built and deployed full-stack apps during the two-day hands-on workshop.",
        confirmedMentors: [],
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: "ev-1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.status).toBe("pending_report_verification");
  });
});
