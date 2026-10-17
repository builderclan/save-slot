import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  AuthProvider,
  useAuth,
  _clearAuthCache,
  type AuthUser,
} from "../auth-context";

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

const mockUser: AuthUser = {
  id: "user-123",
  email: "lead@campus.edu",
  fullName: "Lead Organizer",
  role: "organizer",
  isAdmin: false,
  isPrincipal: false,
  isVicePrincipal: false,
  isLead: true,
  leadCommunities: [{ id: "comm-1", name: "Coding Club", slug: "coding-club" }],
};

describe("AuthContext & AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _clearAuthCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    _clearAuthCache();
  });

  it("throws error if useAuth is invoked outside of AuthProvider", () => {
    function Consumer() {
      useAuth();
      return null;
    }

    expect(() => renderToString(<Consumer />)).toThrow(
      "useAuth must be used within an AuthProvider"
    );
  });

  it("provides initialUser immediately without loading state", () => {
    let capturedAuth: ReturnType<typeof useAuth> | null = null;

    function TestConsumer() {
      capturedAuth = useAuth();
      return <div>User: {capturedAuth.user?.fullName}</div>;
    }

    const html = renderToString(
      <AuthProvider initialUser={mockUser}>
        <TestConsumer />
      </AuthProvider>
    );

    expect(html).toContain("Lead Organizer");
    expect(capturedAuth).not.toBeNull();
    expect(capturedAuth!.user).toEqual(mockUser);
    expect(capturedAuth!.loading).toBe(false);
  });

  it("deduplicates concurrent in-flight fetch requests to /api/auth/me", async () => {
    let fetchCount = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      fetchCount++;
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            authenticated: true,
            user: mockUser,
          }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    let authContextVal: ReturnType<typeof useAuth> | null = null;
    function Consumer() {
      authContextVal = useAuth();
      return null;
    }

    renderToString(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    // Call refreshSession concurrently 3 times
    const [res1, res2, res3] = await Promise.all([
      authContextVal!.refreshSession(false),
      authContextVal!.refreshSession(false),
      authContextVal!.refreshSession(false),
    ]);

    expect(res1).toEqual(mockUser);
    expect(res2).toEqual(mockUser);
    expect(res3).toEqual(mockUser);
    // Even though 3 components/calls triggered refreshSession, only 1 HTTP request was made!
    expect(fetchCount).toBe(1);
  });

  it("reuses cached session within TTL without issuing extra fetch calls", async () => {
    let fetchCount = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      fetchCount++;
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            authenticated: true,
            user: mockUser,
          }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    let authContextVal: ReturnType<typeof useAuth> | null = null;
    function Consumer() {
      authContextVal = useAuth();
      return null;
    }

    renderToString(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    // First fetch
    await authContextVal!.refreshSession(false);
    expect(fetchCount).toBe(1);

    // Second fetch within TTL (force = false)
    const cachedResult = await authContextVal!.refreshSession(false);
    expect(cachedResult).toEqual(mockUser);
    expect(fetchCount).toBe(1); // No new network call

    // Force fetch bypasses TTL
    await authContextVal!.refreshSession(true);
    expect(fetchCount).toBe(2); // Network call forced
  });

  it("handles unauthenticated responses gracefully", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          authenticated: false,
          user: null,
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    let authContextVal: ReturnType<typeof useAuth> | null = null;
    function Consumer() {
      authContextVal = useAuth();
      return null;
    }

    renderToString(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    const user = await authContextVal!.refreshSession(true);
    expect(user).toBeNull();
  });

  it("executes logout, clears cached session, and redirects to home", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    let authContextVal: ReturnType<typeof useAuth> | null = null;
    function Consumer() {
      authContextVal = useAuth();
      return null;
    }

    renderToString(
      <AuthProvider initialUser={mockUser}>
        <Consumer />
      </AuthProvider>
    );

    expect(authContextVal!.isLoggingOut).toBe(false);
    await authContextVal!.logout();

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", {
      method: "POST",
    });
    expect(mockPush).toHaveBeenCalledWith("/");
    expect(mockRefresh).toHaveBeenCalled();
    expect(authContextVal!.isLoggingOut).toBe(false);
  });
});
