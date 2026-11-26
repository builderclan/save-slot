import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, clearLoginAttemptsForTesting } from "../route";
import type { AuthSession } from "@/server/auth";

const mockSignInWithPassword = vi.fn();
const mockResolveAuthSessionForUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  })),
}));

vi.mock("@/server/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/auth")>();
  return {
    ...actual,
    resolveAuthSessionForUser: (...args: unknown[]) => mockResolveAuthSessionForUser(...args),
  };
});

let failedAttemptsCount = 0;
vi.mock("@/lib/rate-limit", () => ({
  getClientRateLimitKey: vi.fn(() => "test-ip:test-email"),
  checkAuthRateLimit: vi.fn(async () => {
    if (failedAttemptsCount >= 3) {
      return { isLocked: true, remainingSeconds: 300, remainingMinutes: 5 };
    }
    return { isLocked: false, remainingSeconds: 0, remainingMinutes: 0 };
  }),
  recordFailedAuthAttempt: vi.fn(async () => {
    failedAttemptsCount += 1;
  }),
  clearAuthRateLimit: vi.fn(async () => {
    failedAttemptsCount = 0;
  }),
  clearRateLimitMemoryCacheForTesting: vi.fn(() => {
    failedAttemptsCount = 0;
  }),
}));

function makeSession(role: AuthSession["profile"]["role"]): AuthSession {
  return {
    userId: `${role}-1`,
    email: `${role}@aisat.ac.in`,
    profile: {
      id: `${role}-1`,
      email: `${role}@aisat.ac.in`,
      full_name: `${role} user`,
      role,
    },
    leadCommunities: [],
    ticCommunities: [],
    hodDepartments: [],
    isAdmin: role === "admin",
    isPrincipal: role === "principal" || role === "vice_principal",
    isVicePrincipal: role === "vice_principal",
    isHod: role === "hod",
    isActingHod: false,
    isTic: role === "tic",
    isStaff: role === "staff",
    isLead: role === "lead",
  };
}

describe("POST /api/auth/login (v1.0.0)", () => {
  const validBody = {
    email: "staff@aisat.ac.in",
    password: "Password123!",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearLoginAttemptsForTesting();
  });

  it("returns 400 when body is invalid", async () => {
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "invalid-email" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("returns 401 when authentication fails", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Invalid credentials" },
    });

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify(validBody),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Invalid email or password");
  });

  it("returns 403 when user profile is inactive or not provisioned", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { id: "u-inactive", email: "old@aisat.ac.in" } },
      error: null,
    });
    mockResolveAuthSessionForUser.mockResolvedValueOnce(null);

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "old@aisat.ac.in", password: "Password123!" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("Account is inactive or not provisioned");
  });

  it("redirects faculty/TIC/HOD/lead accounts to /lead", async () => {
    for (const role of ["staff", "tic", "hod", "lead"] as const) {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: { id: `${role}-1`, email: `${role}@aisat.ac.in` } },
        error: null,
      });
      mockResolveAuthSessionForUser.mockResolvedValueOnce(makeSession(role));

      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: `${role}@aisat.ac.in`, password: "Password123!" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user.role).toBe(role);
      expect(data.redirectUrl).toBe("/lead");
    }
  });

  it("redirects to /admin for admin role", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { id: "admin-1", email: "admin@aisat.ac.in" } },
      error: null,
    });
    mockResolveAuthSessionForUser.mockResolvedValueOnce(makeSession("admin"));

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@aisat.ac.in", password: "Password123!" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.role).toBe("admin");
    expect(data.redirectUrl).toBe("/admin");
  });

  it("redirects to /principal for principal and vice_principal roles", async () => {
    for (const role of ["principal", "vice_principal"] as const) {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: { id: `${role}-1`, email: `${role}@aisat.ac.in` } },
        error: null,
      });
      mockResolveAuthSessionForUser.mockResolvedValueOnce(makeSession(role));

      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: `${role}@aisat.ac.in`, password: "Password123!" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user.role).toBe(role);
      expect(data.redirectUrl).toBe("/principal");
    }
  });

  it("enforces cooldown (429) after 3 consecutive failed login attempts", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid credentials" },
    });

    const createReq = () =>
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "x-forwarded-for": "192.168.1.100" },
        body: JSON.stringify({ email: "victim@aisat.ac.in", password: "badpassword" }),
      });

    expect((await POST(createReq())).status).toBe(401);
    expect((await POST(createReq())).status).toBe(401);
    expect((await POST(createReq())).status).toBe(401);

    const res4 = await POST(createReq());
    expect(res4.status).toBe(429);
    const data4 = await res4.json();
    expect(data4.error).toContain("Too many failed login attempts");
    expect(res4.headers.get("Retry-After")).toBe("300");
  });

  it("clears failed attempt counter on successful login", async () => {
    mockSignInWithPassword
      .mockResolvedValueOnce({ data: { user: null }, error: { message: "Invalid credentials" } })
      .mockResolvedValueOnce({ data: { user: null }, error: { message: "Invalid credentials" } });

    const reqFail = () =>
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "x-forwarded-for": "192.168.1.100" },
        body: JSON.stringify({ email: "victim@aisat.ac.in", password: "badpassword" }),
      });

    await POST(reqFail());
    await POST(reqFail());

    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { id: "staff-1", email: "victim@aisat.ac.in" } },
      error: null,
    });
    mockResolveAuthSessionForUser.mockResolvedValueOnce(makeSession("staff"));

    const resSuccess = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "x-forwarded-for": "192.168.1.100" },
        body: JSON.stringify({ email: "victim@aisat.ac.in", password: "correctpassword" }),
      })
    );
    expect(resSuccess.status).toBe(200);

    mockSignInWithPassword
      .mockResolvedValueOnce({ data: { user: null }, error: { message: "Invalid credentials" } })
      .mockResolvedValueOnce({ data: { user: null }, error: { message: "Invalid credentials" } });
    expect((await POST(reqFail())).status).toBe(401);
    expect((await POST(reqFail())).status).toBe(401);
  });
});
