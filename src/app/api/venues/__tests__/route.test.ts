import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";

const mockOrderBy = vi.fn();
const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }));
const mockFrom = vi.fn(() => ({ where: mockWhere }));
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

describe("GET /api/venues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns active venues with 200 OK and caching headers", async () => {
    mockOrderBy.mockResolvedValueOnce([
      {
        id: "v-1",
        campus_id: "campus-1",
        name: "Main Auditorium",
        building: "Hall A",
        capacity: 500,
        address: "123 Campus Way",
        notes: "Projector available",
        is_active: true,
      },
      {
        id: "v-2",
        campus_id: "campus-1",
        name: "Seminar Room 1",
        building: "Hall B",
        capacity: null,
        address: null,
        notes: null,
        is_active: true,
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, s-maxage=60, stale-while-revalidate=300");

    const data = await res.json();
    expect(data.venues).toHaveLength(2);
    expect(data.venues[0].name).toBe("Main Auditorium");
    expect(data.venues[0].capacity).toBe(500);
    expect(data.venues[1].name).toBe("Seminar Room 1");
    expect(data.venues[1].capacity).toBeNull();
    expect(data.venues[1].address).toBeNull();

    expect(mockSelect).toHaveBeenCalledTimes(1);
    expect(mockWhere).toHaveBeenCalledTimes(1);
    expect(mockOrderBy).toHaveBeenCalledTimes(1);
  });

  it("handles database query failure with 500 status", async () => {
    mockOrderBy.mockRejectedValueOnce(new Error("Connection refused"));

    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Connection refused");
  });
});
