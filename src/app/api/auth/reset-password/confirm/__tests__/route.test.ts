import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";

const mockGetUser = vi.fn();
const mockUpdateUser = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
      updateUser: mockUpdateUser,
      signOut: mockSignOut,
    },
  })),
}));

describe("POST /api/auth/reset-password/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when passwords do not match", async () => {
    const request = new Request("http://localhost:3000/api/auth/reset-password/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "newPassword123",
        confirmPassword: "mismatchedPassword456",
      }),
    });

    const res = await POST(request);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Passwords do not match");
  });

  it("returns 400 when password is under 6 characters", async () => {
    const request = new Request("http://localhost:3000/api/auth/reset-password/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "123",
        confirmPassword: "123",
      }),
    });

    const res = await POST(request);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("at least 6 characters");
  });

  it("returns 401 when user has no active recovery session", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Invalid session" },
    });

    const request = new Request("http://localhost:3000/api/auth/reset-password/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "newSecurePassword123",
        confirmPassword: "newSecurePassword123",
      }),
    });

    const res = await POST(request);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain("expired or is invalid");
  });

  it("returns 400 when Supabase updateUser fails", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-123", email: "student@campus.edu" } },
      error: null,
    });
    mockUpdateUser.mockResolvedValueOnce({
      data: null,
      error: { message: "New password should be different from the old password." },
    });

    const request = new Request("http://localhost:3000/api/auth/reset-password/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "newSecurePassword123",
        confirmPassword: "newSecurePassword123",
      }),
    });

    const res = await POST(request);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("different from the old password");
  });

  it("successfully updates password and invalidates recovery session", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-123", email: "student@campus.edu" } },
      error: null,
    });
    mockUpdateUser.mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockSignOut.mockResolvedValueOnce({ error: null });

    const request = new Request("http://localhost:3000/api/auth/reset-password/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "newSecurePassword123",
        confirmPassword: "newSecurePassword123",
      }),
    });

    const res = await POST(request);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    expect(mockUpdateUser).toHaveBeenCalledWith({ password: "newSecurePassword123" });
    expect(mockSignOut).toHaveBeenCalled();
  });
});
