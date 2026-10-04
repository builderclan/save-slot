import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";

const mockGetUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

describe("Edge Proxy Auth Guard (src/proxy.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("redirects unauthenticated users attempting to access /admin to /login with returnTo", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    const req = new NextRequest("http://localhost:3000/admin");
    const response = await proxy(req);

    expect(response.status).toBe(307);
    const redirectLocation = response.headers.get("location");
    expect(redirectLocation).toBe("http://localhost:3000/login?returnTo=%2Fadmin");
  });

  it("redirects unauthenticated users attempting to access /principal to /login with returnTo", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    const req = new NextRequest("http://localhost:3000/principal");
    const response = await proxy(req);

    expect(response.status).toBe(307);
    const redirectLocation = response.headers.get("location");
    expect(redirectLocation).toBe("http://localhost:3000/login?returnTo=%2Fprincipal");
  });

  it("redirects unauthenticated users attempting to access /lead to /login with returnTo", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    const req = new NextRequest("http://localhost:3000/lead");
    const response = await proxy(req);

    expect(response.status).toBe(307);
    const redirectLocation = response.headers.get("location");
    expect(redirectLocation).toBe("http://localhost:3000/login?returnTo=%2Flead");
  });

  it("allows authenticated users to access protected routes", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-uuid-1", email: "principal@aisat.ac.in" } },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/principal");
    const response = await proxy(req);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("allows unauthenticated users to access public routes like /", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    const req = new NextRequest("http://localhost:3000/");
    const response = await proxy(req);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
