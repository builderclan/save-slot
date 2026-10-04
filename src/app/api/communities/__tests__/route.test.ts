import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import type { QueryResult, QueryResultRow } from "pg";

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
}));

import { query } from "@/lib/db";

const mockQuery = vi.mocked(query);

function mockDbResult<T extends QueryResultRow>(rows: T[]): QueryResult<T> {
  return {
    rows,
    command: "SELECT",
    rowCount: rows.length,
    oid: 0,
    fields: [],
  };
}

describe("GET /api/communities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns active campus communities with 200 OK", async () => {
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

    mockQuery.mockResolvedValueOnce(mockDbResult(mockCommunities));

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.communities).toHaveLength(2);
    expect(data.communities[0].name).toBe("Coding Club");
    expect(data.communities[1].slug).toBe("design-society");
  });

  it("handles database query failure with 500 status", async () => {
    mockQuery.mockRejectedValueOnce(new Error("Database connection timeout"));

    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("Database connection timeout");
  });
});
