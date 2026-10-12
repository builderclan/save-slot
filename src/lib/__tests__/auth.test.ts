import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "../auth";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { query } from "@/lib/db";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
}));

describe("Strict Role Isolation - getCurrentUser (src/lib/auth.ts)", () => {
  const mockCookies = vi.mocked(cookies);
  const mockCreateClient = vi.mocked(createClient);
  const mockQuery = vi.mocked(query);

  const mockGetUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.mockResolvedValue({
      getAll: () => [{ name: "sb-auth-token", value: "test-token" }],
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: mockGetUser,
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);
  });

  it("returns null if no auth cookie is present", async () => {
    mockCookies.mockResolvedValueOnce({
      getAll: () => [],
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    const session = await getCurrentUser();
    expect(session).toBeNull();
  });

  it("strictly isolates Admin role (isAdmin=true, others=false even with community rows)", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "admin-uuid", email: "admin@campus.edu" } },
      error: null,
    });

    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: "admin-uuid",
            email: "admin@campus.edu",
            full_name: "Campus Admin",
            role: "admin",
            campus_id: "campus-1",
          },
        ],
      } as unknown as Awaited<ReturnType<typeof query>>)
      .mockResolvedValueOnce({
        rows: [
          {
            id: "comm-1",
            name: "Coding Club",
            slug: "coding",
            category: "tech",
          },
        ],
      } as unknown as Awaited<ReturnType<typeof query>>);

    const session = await getCurrentUser();
    expect(session).not.toBeNull();
    expect(session?.isAdmin).toBe(true);
    expect(session?.isPrincipal).toBe(false);
    expect(session?.isVicePrincipal).toBe(false);
    expect(session?.isLead).toBe(false);
  });

  it("strictly isolates Principal role (isPrincipal=true, isAdmin=false, isLead=false)", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "principal-uuid", email: "principal@campus.edu" } },
      error: null,
    });

    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: "principal-uuid",
            email: "principal@campus.edu",
            full_name: "College Principal",
            role: "principal",
            campus_id: "campus-1",
          },
        ],
      } as unknown as Awaited<ReturnType<typeof query>>)
      .mockResolvedValueOnce({
        rows: [
          {
            id: "comm-1",
            name: "Robotics Club",
            slug: "robotics",
            category: "tech",
          },
        ],
      } as unknown as Awaited<ReturnType<typeof query>>);

    const session = await getCurrentUser();
    expect(session).not.toBeNull();
    expect(session?.isAdmin).toBe(false);
    expect(session?.isPrincipal).toBe(true);
    expect(session?.isVicePrincipal).toBe(false);
    expect(session?.isLead).toBe(false);
  });

  it("strictly isolates Vice Principal role (isPrincipal=true, isVicePrincipal=true, others=false)", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "vp-uuid", email: "viceprincipal@campus.edu" } },
      error: null,
    });

    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: "vp-uuid",
            email: "viceprincipal@campus.edu",
            full_name: "Vice Principal",
            role: "vice_principal",
            campus_id: "campus-1",
          },
        ],
      } as unknown as Awaited<ReturnType<typeof query>>)
      .mockResolvedValueOnce({
        rows: [],
      } as unknown as Awaited<ReturnType<typeof query>>);

    const session = await getCurrentUser();
    expect(session).not.toBeNull();
    expect(session?.isAdmin).toBe(false);
    expect(session?.isPrincipal).toBe(true);
    expect(session?.isVicePrincipal).toBe(true);
    expect(session?.isLead).toBe(false);
  });

  it("strictly isolates Lead role with organizer role (isLead=true, others=false)", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "lead-uuid", email: "lead.coding@campus.edu" } },
      error: null,
    });

    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: "lead-uuid",
            email: "lead.coding@campus.edu",
            full_name: "Coding Club Lead",
            role: "organizer",
            campus_id: "campus-1",
          },
        ],
      } as unknown as Awaited<ReturnType<typeof query>>)
      .mockResolvedValueOnce({
        rows: [
          {
            id: "comm-1",
            name: "Coding Club",
            slug: "coding",
            category: "tech",
          },
        ],
      } as unknown as Awaited<ReturnType<typeof query>>);

    const session = await getCurrentUser();
    expect(session).not.toBeNull();
    expect(session?.isAdmin).toBe(false);
    expect(session?.isPrincipal).toBe(false);
    expect(session?.isVicePrincipal).toBe(false);
    expect(session?.isLead).toBe(true);
  });

  it("strictly marks student with active community leadership as Lead only", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "student-lead-uuid", email: "student.lead@campus.edu" } },
      error: null,
    });

    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: "student-lead-uuid",
            email: "student.lead@campus.edu",
            full_name: "Student Lead",
            role: "student",
            campus_id: "campus-1",
          },
        ],
      } as unknown as Awaited<ReturnType<typeof query>>)
      .mockResolvedValueOnce({
        rows: [
          {
            id: "comm-2",
            name: "Design Society",
            slug: "design",
            category: "arts",
          },
        ],
      } as unknown as Awaited<ReturnType<typeof query>>);

    const session = await getCurrentUser();
    expect(session).not.toBeNull();
    expect(session?.isAdmin).toBe(false);
    expect(session?.isPrincipal).toBe(false);
    expect(session?.isVicePrincipal).toBe(false);
    expect(session?.isLead).toBe(true);
  });

  it("marks regular student without leadership as having no portal access", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "regular-student-uuid", email: "student@campus.edu" } },
      error: null,
    });

    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: "regular-student-uuid",
            email: "student@campus.edu",
            full_name: "Regular Student",
            role: "student",
            campus_id: "campus-1",
          },
        ],
      } as unknown as Awaited<ReturnType<typeof query>>)
      .mockResolvedValueOnce({
        rows: [],
      } as unknown as Awaited<ReturnType<typeof query>>);

    const session = await getCurrentUser();
    expect(session).not.toBeNull();
    expect(session?.isAdmin).toBe(false);
    expect(session?.isPrincipal).toBe(false);
    expect(session?.isVicePrincipal).toBe(false);
    expect(session?.isLead).toBe(false);
  });
});
