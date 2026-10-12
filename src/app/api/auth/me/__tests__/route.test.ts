import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

import { getCurrentUser, type AuthSession } from "@/lib/auth";

const mockGetCurrentUser = vi.mocked(getCurrentUser);

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthenticated when session is null", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.authenticated).toBe(false);
    expect(data.user).toBeNull();
  });

  it("returns user payload when authenticated", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      userId: "user-123",
      email: "user@campus.edu",
      profile: {
        id: "user-123",
        email: "user@campus.edu",
        full_name: "Test User",
        role: "admin",
      },
      leadCommunities: [],
      isAdmin: true,
      isPrincipal: false,
      isVicePrincipal: false,
      isLead: false,
    } as AuthSession);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.authenticated).toBe(true);
    expect(data.user.id).toBe("user-123");
    expect(data.user.email).toBe("user@campus.edu");
    expect(data.user.fullName).toBe("Test User");
    expect(data.user.isAdmin).toBe(true);
  });
});
