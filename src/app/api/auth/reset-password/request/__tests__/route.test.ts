import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";

const mockResetPasswordForEmail = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
  })),
}));

describe("POST /api/auth/reset-password/request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid email address format", async () => {
    const request = new Request("http://localhost:3000/api/auth/reset-password/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalid-email" }),
    });

    const res = await POST(request);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Please enter a valid campus email address");
  });

  it("returns 200 generic success when valid email is submitted", async () => {
    mockResetPasswordForEmail.mockResolvedValueOnce({
      data: {},
      error: null,
    });

    const request = new Request("http://localhost:3000/api/auth/reset-password/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "student@campus.edu" }),
    });

    const res = await POST(request);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain("If an account exists with this email");

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      "student@campus.edu",
      expect.objectContaining({
        redirectTo: "http://localhost:3000/auth/callback?next=/reset-password",
      })
    );
  });

  it("returns 429 when Supabase rate limit is exceeded", async () => {
    mockResetPasswordForEmail.mockResolvedValueOnce({
      data: null,
      error: {
        status: 429,
        message: "For security purposes, you can only request this once every 60 seconds",
      },
    });

    const request = new Request("http://localhost:3000/api/auth/reset-password/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "student@campus.edu" }),
    });

    const res = await POST(request);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toContain("Too many password reset requests");
  });

  it("returns generic success even if Supabase returns non-rate-limit warning (anti-enumeration)", async () => {
    mockResetPasswordForEmail.mockResolvedValueOnce({
      data: null,
      error: {
        status: 400,
        message: "User not found",
      },
    });

    const request = new Request("http://localhost:3000/api/auth/reset-password/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "unregistered@campus.edu" }),
    });

    const res = await POST(request);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain("If an account exists with this email");
  });
});
