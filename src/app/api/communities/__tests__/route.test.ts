import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";

const mockOrderBy = vi.fn();
const mockFrom = vi.fn(() => ({ orderBy: mockOrderBy }));
const mockSelect = vi.fn();
mockSelect.mockReturnValue({ from: mockFrom });

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
  withDbRetry: (op: (client: { select: (...args: unknown[]) => unknown }) => Promise<unknown>) =>
    op({
      select: (...args: unknown[]) => mockSelect(...args),
    }),
}));

describe("GET /api/communities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns active campus communities with 200 OK and caching headers", async () => {
    const mockCommunities = [
      {
        id: "c-1",
        campus_id: "campus-1",
        name: "Coding Club",
        slug: "coding-club",
        category: "Tech",
        description: "Official developer club",
        logo_url: null,
      },
      {
        id: "c-2",
        campus_id: "campus-1",
        name: "Design Society",
        slug: "design-society",
        category: "Arts",
        description: "Design and creative arts",
        logo_url: null,
      },
    ];

    mockOrderBy.mockResolvedValueOnce(mockCommunities);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, s-maxage=60, stale-while-revalidate=300");

    const data = await res.json();
    expect(data.communities).toHaveLength(2);
    expect(data.communities[0].name).toBe("Coding Club");
    expect(data.communities[1].slug).toBe("design-society");

    expect(mockSelect).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockOrderBy).toHaveBeenCalledTimes(1);
  });

  it("handles database query failure with 500 status", async () => {
    mockOrderBy.mockRejectedValueOnce(new Error("Database connection timeout"));

    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("Database connection timeout");
  });
});
