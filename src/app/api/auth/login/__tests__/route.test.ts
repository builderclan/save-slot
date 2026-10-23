import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, clearLoginAttemptsForTesting } from "../route";

const mockSignInWithPassword = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  })),
}));

vi.mock("@/lib/campus", () => ({
  getPrimaryCampusId: vi.fn(),
}));

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

const {
  mockSelect,
  mockSelectLimit,
  mockUpdate,
} = vi.hoisted(() => {
  const mockSelectLimit = vi.fn();
  const mockSelectWhere = vi.fn();
  const mockSelectFrom = vi.fn();
  const mockSelect = vi.fn();

  const mockUpdateWhere = vi.fn();
  const mockUpdateSet = vi.fn();
  const mockUpdate = vi.fn();

  mockSelectWhere.mockReturnValue({ limit: mockSelectLimit });
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockSelect.mockReturnValue({ from: mockSelectFrom });

  mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
  mockUpdate.mockReturnValue({ set: mockUpdateSet });

  return {
    mockSelect,
    mockSelectLimit,
    mockUpdate,
  };
});

vi.mock("@/lib/db", () => {
  const mockDbClient = {
    select: mockSelect,
    update: mockUpdate,
  };

  return {
    db: mockDbClient,
    withDbRetry: (op: (client: typeof mockDbClient) => Promise<unknown>) => op(mockDbClient),
  };
});

import { getPrimaryCampusId } from "@/lib/campus";

const mockGetPrimaryCampusId = vi.mocked(getPrimaryCampusId);

describe("POST /api/auth/login", () => {
  const validBody = {
    email: "student@campus.edu",
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

  it("returns 200 with student redirect on successful login", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: {
        user: { id: "user-1", email: "student@campus.edu" },
      },
      error: null,
    });

    // Profile lookup
    mockSelectLimit.mockResolvedValueOnce([
      {
        id: "user-1",
        email: "student@campus.edu",
        fullName: "Test Student",
        role: "student",
        campusId: "campus-1",
      },
    ]);
    // Community members check (not lead)
    mockSelectLimit.mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify(validBody),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.role).toBe("student");
    expect(data.redirectUrl).toBe("/");
  });

  it("self-heals campusId if profile has empty campus_id", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: {
        user: { id: "user-1", email: "student@campus.edu" },
      },
      error: null,
    });

    // Profile lookup without campusId
    mockSelectLimit.mockResolvedValueOnce([
      {
        id: "user-1",
        email: "student@campus.edu",
        fullName: "Test Student",
        role: "student",
        campusId: null,
      },
    ]);
    mockGetPrimaryCampusId.mockResolvedValueOnce("campus-aisat-uuid");
    // Community members check
    mockSelectLimit.mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify(validBody),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockGetPrimaryCampusId).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("promotes active community lead to organizer role", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: {
        user: { id: "user-lead-1", email: "lead@campus.edu" },
      },
      error: null,
    });

    // Profile has student role in users table
    mockSelectLimit.mockResolvedValueOnce([
      {
        id: "user-lead-1",
        email: "lead@campus.edu",
        fullName: "Club Lead",
        role: "student",
        campusId: "campus-1",
      },
    ]);
    // Active community lead membership found
    mockSelectLimit.mockResolvedValueOnce([{ one: 1 }]);

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "lead@campus.edu",
        password: "Password123!",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.role).toBe("organizer");
    expect(data.redirectUrl).toBe("/lead");
  });

  it("redirects to /admin for admin role", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: {
        user: { id: "admin-1", email: "admin@campus.edu" },
      },
      error: null,
    });

    mockSelectLimit.mockResolvedValueOnce([
      {
        id: "admin-1",
        email: "admin@campus.edu",
        fullName: "Admin",
        role: "admin",
        campusId: "campus-1",
      },
    ]);

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "admin@campus.edu",
        password: "Password123!",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.role).toBe("admin");
    expect(data.redirectUrl).toBe("/admin");
  });

  it("redirects to /principal for principal role", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: {
        user: { id: "principal-1", email: "principal@campus.edu" },
      },
      error: null,
    });

    mockSelectLimit.mockResolvedValueOnce([
      {
        id: "principal-1",
        email: "principal@campus.edu",
        fullName: "Principal",
        role: "principal",
        campusId: "campus-1",
      },
    ]);

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "principal@campus.edu",
        password: "Password123!",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.role).toBe("principal");
    expect(data.redirectUrl).toBe("/principal");
  });

  it("enforces cooldown (429) after 3 consecutive failed login attempts (SEC-11 Brute-Force defense)", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid credentials" },
    });

    const createReq = () =>
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "x-forwarded-for": "192.168.1.100" },
        body: JSON.stringify({ email: "victim@campus.edu", password: "badpassword" }),
      });

    // Attempt 1: 401
    const res1 = await POST(createReq());
    expect(res1.status).toBe(401);

    // Attempt 2: 401
    const res2 = await POST(createReq());
    expect(res2.status).toBe(401);

    // Attempt 3: 401
    const res3 = await POST(createReq());
    expect(res3.status).toBe(401);

    // Attempt 4: Should be rate limited (429)
    const res4 = await POST(createReq());
    expect(res4.status).toBe(429);
    const data4 = await res4.json();
    expect(data4.error).toContain("Too many failed login attempts");
    expect(res4.headers.get("Retry-After")).toBeDefined();
  });

  it("clears failed attempt counter on successful login", async () => {
    // 2 failed attempts
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Invalid credentials" },
    });
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Invalid credentials" },
    });

    const reqFail = () =>
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "x-forwarded-for": "192.168.1.100" },
        body: JSON.stringify({ email: "victim@campus.edu", password: "badpassword" }),
      });

    await POST(reqFail());
    await POST(reqFail());

    // 3rd attempt succeeds
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { id: "user-1", email: "victim@campus.edu" } },
      error: null,
    });
    mockSelectLimit.mockResolvedValueOnce([
      { id: "user-1", email: "victim@campus.edu", fullName: "User", role: "student", campusId: "campus-1" },
    ]);
    mockSelectLimit.mockResolvedValueOnce([]);

    const reqSuccess = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "x-forwarded-for": "192.168.1.100" },
      body: JSON.stringify({ email: "victim@campus.edu", password: "correctpassword" }),
    });

    const resSuccess = await POST(reqSuccess);
    expect(resSuccess.status).toBe(200);

    // Next failed attempt should be attempt 1 again (not blocked)
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Invalid credentials" },
    });
    const resAfterReset = await POST(reqFail());
    expect(resAfterReset.status).toBe(401);
  });
});
