import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPrimaryCampusId, resetCampusCache } from "../campus";

const {
  mockSelect,
  mockSelectLimit,
  mockInsert,
  mockInsertReturning,
} = vi.hoisted(() => {
  const mockSelectLimit = vi.fn();
  const mockSelectWhere = vi.fn();
  const mockSelectFrom = vi.fn();
  const mockSelect = vi.fn();

  const mockInsertReturning = vi.fn();
  const mockInsertOnConflictDoUpdate = vi.fn();
  const mockInsertValues = vi.fn();
  const mockInsert = vi.fn();

  mockSelectWhere.mockReturnValue({ limit: mockSelectLimit });
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockSelect.mockReturnValue({ from: mockSelectFrom });

  mockInsertOnConflictDoUpdate.mockReturnValue({ returning: mockInsertReturning });
  mockInsertValues.mockReturnValue({ onConflictDoUpdate: mockInsertOnConflictDoUpdate });
  mockInsert.mockReturnValue({ values: mockInsertValues });

  return {
    mockSelect,
    mockSelectLimit,
    mockInsert,
    mockInsertReturning,
  };
});

vi.mock("@/lib/db", () => {
  const mockDbClient = {
    select: mockSelect,
    insert: mockInsert,
  };

  return {
    db: mockDbClient,
    withDbRetry: (op: (client: typeof mockDbClient) => Promise<unknown>) => op(mockDbClient),
  };
});

describe("Campus Domain Resolver (getPrimaryCampusId)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCampusCache();
  });

  it("resolves primary campus from database and caches result", async () => {
    mockSelectLimit.mockResolvedValueOnce([{ id: "campus-aisat-uuid" }]);

    const campusId1 = await getPrimaryCampusId();
    expect(campusId1).toBe("campus-aisat-uuid");
    expect(mockSelect).toHaveBeenCalledTimes(1);

    // Second call should return cached value without executing db query
    const campusId2 = await getPrimaryCampusId();
    expect(campusId2).toBe("campus-aisat-uuid");
    expect(mockSelect).toHaveBeenCalledTimes(1);
  });

  it("self-seeds configured canonical campus when slug is not found in database", async () => {
    // 1. Where query by slug returns empty
    mockSelectLimit.mockResolvedValueOnce([]);
    // 2. Insert returns newly seeded configured campus
    mockInsertReturning.mockResolvedValueOnce([{ id: "campus-seeded-uuid" }]);

    const campusId = await getPrimaryCampusId();
    expect(campusId).toBe("campus-seeded-uuid");
    expect(mockSelect).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it("handles database error gracefully and returns empty string", async () => {
    mockSelectLimit.mockRejectedValueOnce(new Error("Database connection lost"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const campusId = await getPrimaryCampusId();
    expect(campusId).toBe("");
    consoleSpy.mockRestore();
  });

  it("resets in-memory cache when resetCampusCache is invoked", async () => {
    mockSelectLimit.mockResolvedValueOnce([{ id: "campus-initial-uuid" }]);

    const campusId1 = await getPrimaryCampusId();
    expect(campusId1).toBe("campus-initial-uuid");
    expect(mockSelect).toHaveBeenCalledTimes(1);

    resetCampusCache();

    mockSelectLimit.mockResolvedValueOnce([{ id: "campus-refreshed-uuid" }]);
    const campusId2 = await getPrimaryCampusId();
    expect(campusId2).toBe("campus-refreshed-uuid");
    expect(mockSelect).toHaveBeenCalledTimes(2);
  });
});
