import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "../auth";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

let currentUserResult: unknown[] = [];
let currentCommsResult: unknown[] = [];

function mockDbUserAndComms(profileRow: unknown | null, commRows: unknown[] = []) {
  currentUserResult = profileRow ? [profileRow] : [];
  currentCommsResult = commRows;
}

const mockSelect = vi.fn().mockImplementation(() => ({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockImplementation(() => Promise.resolve(currentUserResult)),
    }),
    innerJoin: vi.fn().mockReturnValue({
      where: vi.fn().mockImplementation(() => Promise.resolve(currentCommsResult)),
    }),
  }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
  withDbRetry: (op: (client: { select: typeof mockSelect }) => Promise<unknown>) =>
    op({
      select: mockSelect,
    }),
}));

describe("Strict Role Isolation - getCurrentUser (src/lib/auth.ts)", () => {
  const mockCookies = vi.mocked(cookies);
  const mockCreateClient = vi.mocked(createClient);

  const mockGetUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    currentUserResult = [];
    currentCommsResult = [];
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

    mockDbUserAndComms(
      {
        id: "admin-uuid",
        email: "admin@campus.edu",
        full_name: "Campus Admin",
        role: "admin",
        campus_id: "campus-1",
      },
      [
        {
          id: "comm-1",
          campus_id: "campus-1",
          name: "Coding Club",
          slug: "coding",
          category: "Tech",
        },
      ]
    );

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

    mockDbUserAndComms(
      {
        id: "principal-uuid",
        email: "principal@campus.edu",
        full_name: "College Principal",
        role: "principal",
        campus_id: "campus-1",
      },
      [
        {
          id: "comm-1",
          campus_id: "campus-1",
          name: "Robotics Club",
          slug: "robotics",
          category: "Tech",
        },
      ]
    );

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

    mockDbUserAndComms(
      {
        id: "vp-uuid",
        email: "viceprincipal@campus.edu",
        full_name: "Vice Principal",
        role: "vice_principal",
        campus_id: "campus-1",
      },
      []
    );

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

    mockDbUserAndComms(
      {
        id: "lead-uuid",
        email: "lead.coding@campus.edu",
        full_name: "Coding Club Lead",
        role: "organizer",
        campus_id: "campus-1",
      },
      [
        {
          id: "comm-1",
          campus_id: "campus-1",
          name: "Coding Club",
          slug: "coding",
          category: "Tech",
        },
      ]
    );

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

    mockDbUserAndComms(
      {
        id: "student-lead-uuid",
        email: "student.lead@campus.edu",
        full_name: "Student Lead",
        role: "student",
        campus_id: "campus-1",
      },
      [
        {
          id: "comm-2",
          campus_id: "campus-1",
          name: "Design Society",
          slug: "design",
          category: "Arts",
        },
      ]
    );

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

    mockDbUserAndComms(
      {
        id: "regular-student-uuid",
        email: "student@campus.edu",
        full_name: "Regular Student",
        role: "student",
        campus_id: "campus-1",
      },
      []
    );

    const session = await getCurrentUser();
    expect(session).not.toBeNull();
    expect(session?.isAdmin).toBe(false);
    expect(session?.isPrincipal).toBe(false);
    expect(session?.isVicePrincipal).toBe(false);
    expect(session?.isLead).toBe(false);
  });
});
