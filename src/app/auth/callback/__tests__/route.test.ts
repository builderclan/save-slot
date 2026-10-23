import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";

const mockExchangeCodeForSession = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  })),
}));

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects with error parameter if error is in searchParams", async () => {
    const request = new Request(
      "http://localhost:3000/auth/callback?error=access_denied&error_description=Token+expired"
    );

    const res = await GET(request);
    expect(res.status).toBe(307); // NextResponse.redirect default status
    const location = res.headers.get("location");
    expect(location).toContain("/reset-password?error=Token%20expired");
  });

  it("exchanges code for session and redirects to target destination", async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    });

    const request = new Request(
      "http://localhost:3000/auth/callback?code=valid-auth-code&next=/reset-password"
    );

    const res = await GET(request);
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toBe("http://localhost:3000/reset-password");
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("valid-auth-code");
  });

  it("redirects to reset-password with error flag if code exchange fails", async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({
      data: null,
      error: { message: "Invalid or expired authorization code" },
    });

    const request = new Request(
      "http://localhost:3000/auth/callback?code=expired-code&next=/reset-password"
    );

    const res = await GET(request);
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/reset-password?error=invalid_token");
  });

  it("falls back to /reset-password if next contains an external or protocol-relative open redirect", async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    });

    const request = new Request(
      "http://localhost:3000/auth/callback?code=valid-auth-code&next=//attacker.com"
    );

    const res = await GET(request);
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toBe("http://localhost:3000/reset-password");
  });

  it("ignores untrusted x-forwarded-host and redirects to safe origin (SEC-06 Host Header Poisoning defense)", async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    });

    const request = new Request(
      "http://localhost:3000/auth/callback?code=valid-auth-code&next=/reset-password",
      {
        headers: {
          "x-forwarded-host": "attacker.com",
        },
      }
    );

    const res = await GET(request);
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toBe("http://localhost:3000/reset-password");
  });

  it("redirects to error state when neither code nor error is provided", async () => {
    const request = new Request("http://localhost:3000/auth/callback");

    const res = await GET(request);
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/reset-password?error=invalid_token");
  });
});

